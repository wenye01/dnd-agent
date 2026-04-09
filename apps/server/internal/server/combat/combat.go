package combat

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/state"
)

// CombatError represents an error in combat operations.
type CombatError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *CombatError) Error() string {
	return e.Message
}

// Error codes
const (
	ErrCombatNotFound      = "COMBAT_NOT_FOUND"
	ErrCombatNotActive     = "COMBAT_NOT_ACTIVE"
	ErrCombatAlreadyActive = "COMBAT_ALREADY_ACTIVE"
	ErrCombatAlreadyEnded  = "COMBAT_ALREADY_ENDED"
	ErrCombatantNotFound   = "COMBATANT_NOT_FOUND"
	ErrNotYourTurn         = "NOT_YOUR_TURN"
	ErrActionExhausted     = "ACTION_EXHAUSTED"
	ErrInvalidTarget       = "INVALID_TARGET"
	ErrInvalidState        = "INVALID_STATE"
	ErrNoCombatants        = "NO_COMBATANTS"
)

// CombatResult holds the outcome of a completed combat encounter.
type CombatResult struct {
	Victory bool   `json:"victory"`
	Reason  string `json:"reason"`
}

// CombatManager manages combat lifecycle and state transitions.
// Combat state is stored in GameState.Combat and updated via StateManager.
type CombatManager struct {
	stateManager *state.Manager
	diceService  dice.DiceRoller
	mu           sync.RWMutex
}

// NewCombatManager creates a new combat manager.
func NewCombatManager(stateManager *state.Manager, diceService dice.DiceRoller) *CombatManager {
	return &CombatManager{
		stateManager: stateManager,
		diceService:  diceService,
	}
}

// GetDiceService returns the dice roller for use by sub-managers.
func (cm *CombatManager) GetDiceService() dice.DiceRoller {
	return cm.diceService
}

// GetStateManager returns the state manager.
func (cm *CombatManager) GetStateManager() *state.Manager {
	return cm.stateManager
}

// StartCombat initializes a new combat encounter for the given session.
// It creates combatants from the provided data, rolls initiative, and
// transitions to the Active state.
func (cm *CombatManager) StartCombat(sessionID string, combatants []*state.Combatant) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if len(combatants) == 0 {
		return nil, &CombatError{Code: ErrNoCombatants, Message: "cannot start combat with no combatants"}
	}

	// Check that combat is not already active
	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: fmt.Sprintf("session %s not found", sessionID)}
	}
	if gs.Combat != nil && gs.Combat.Status == state.CombatActive {
		return nil, &CombatError{Code: ErrCombatAlreadyActive, Message: "combat is already active"}
	}

	// Roll initiative for all combatants
	initiativeEntries := cm.rollInitiative(combatants)

	// Reorder participants to match sorted initiative order
	sortedParticipants := cm.reorderParticipantsByInitiative(combatants, initiativeEntries)

	// Create combat state
	combatState := &state.CombatState{
		Status:        state.CombatActive,
		Round:         1,
		TurnIndex:     0,
		Initiatives:   initiativeEntries,
		Participants:  sortedParticipants,
		ActiveEffects: make([]*state.ActiveEffect, 0),
	}

	// Set initial turn resources for first combatant (highest initiative)
	if len(sortedParticipants) > 0 {
		cm.resetTurnResources(sortedParticipants[0])
	}

	// Update game state
	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = combatState
		gs.Phase = state.PhaseCombat
	})
	if err != nil {
		return nil, fmt.Errorf("start combat: %w", err)
	}

	// Build result
	firstCombatant := sortedParticipants[0]
	result := map[string]interface{}{
		"status":          "active",
		"round":           1,
		"currentTurn":     firstCombatant.Name,
		"currentTurnId":   firstCombatant.ID,
		"initiativeOrder": initiativeEntries,
		"combatants":      sortedParticipants,
	}

	return result, nil
}

// EndCombat transitions combat to ended state and resets the game phase.
func (cm *CombatManager) EndCombat(sessionID string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat to end"}
	}

	var result CombatResult
	ended, victory := cm.checkCombatEnd(gs.Combat)
	if ended {
		result = victory
	} else {
		result = CombatResult{Victory: false, Reason: "combat ended manually"}
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat.Status = state.CombatEnded
		gs.Phase = state.PhaseExploring
	})
	if err != nil {
		return nil, fmt.Errorf("end combat: %w", err)
	}

	return map[string]interface{}{
		"status":  "ended",
		"victory": result.Victory,
		"reason":  result.Reason,
	}, nil
}

// GetCombatState returns the current combat state for a session.
func (cm *CombatManager) GetCombatState(sessionID string) (map[string]interface{}, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil {
		return map[string]interface{}{
			"status": "idle",
		}, nil
	}

	cs := gs.Combat
	currentCombatant := cm.getCurrentCombatant(cs)

	result := map[string]interface{}{
		"status":        string(cs.Status),
		"round":         cs.Round,
		"turnIndex":     cs.TurnIndex,
		"initiatives":   cs.Initiatives,
		"participants":  cs.Participants,
		"activeEffects": cs.ActiveEffects,
	}

	if currentCombatant != nil {
		result["currentTurn"] = currentCombatant.Name
		result["currentTurnId"] = currentCombatant.ID
	}

	return result, nil
}

// rollInitiative rolls d20 + DEX modifier for each combatant and sorts by
// highest initiative, using DEX score as tiebreaker.
func (cm *CombatManager) rollInitiative(combatants []*state.Combatant) []*state.InitiativeEntry {
	entries := make([]*state.InitiativeEntry, 0, len(combatants))

	for _, c := range combatants {
		dexMod := (c.DexScore - 10) / 2
		// Floor division adjustment for negative modifiers
		if (c.DexScore-10)%2 != 0 && (c.DexScore-10) < 0 {
			dexMod -= 1
		}

		roll, err := cm.diceService.Roll("1d20")
		if err != nil {
			// Fallback to flat DEX mod on error
			entries = append(entries, &state.InitiativeEntry{
				CharacterID: c.ID,
				Initiative:  dexMod,
				HasActed:    false,
			})
			continue
		}

		entries = append(entries, &state.InitiativeEntry{
			CharacterID: c.ID,
			Initiative:  roll.Total + dexMod,
			HasActed:    false,
		})
	}

	// Sort by initiative descending, then DEX score descending for ties
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Initiative != entries[j].Initiative {
			return entries[i].Initiative > entries[j].Initiative
		}
		iDex := cm.getDexScoreForEntry(entries[i], combatants)
		jDex := cm.getDexScoreForEntry(entries[j], combatants)
		return jDex < iDex
	})

	return entries
}

// getDexScoreForEntry looks up the DEX score for a given initiative entry.
func (cm *CombatManager) getDexScoreForEntry(entry *state.InitiativeEntry, combatants []*state.Combatant) int {
	for _, c := range combatants {
		if c.ID == entry.CharacterID {
			return c.DexScore
		}
	}
	return 10
}

// getCurrentCombatant returns the combatant whose turn it is.
func (cm *CombatManager) getCurrentCombatant(cs *state.CombatState) *state.Combatant {
	if cs.TurnIndex >= len(cs.Participants) {
		return nil
	}
	return cs.Participants[cs.TurnIndex]
}

// getCombatantByID finds a combatant by ID in the combat state.
func (cm *CombatManager) getCombatantByID(cs *state.CombatState, id string) *state.Combatant {
	for _, p := range cs.Participants {
		if p.ID == id {
			return p
		}
	}
	return nil
}

// resetTurnResources resets action, bonus action, and reaction to available.
func (cm *CombatManager) resetTurnResources(c *state.Combatant) {
	c.Action = state.ActionAvailable
	c.BonusAction = state.ActionAvailable
	c.Reaction = state.ActionAvailable
}

// reorderParticipantsByInitiative returns a new slice of combatants ordered
// to match the sorted initiative entries.
func (cm *CombatManager) reorderParticipantsByInitiative(combatants []*state.Combatant, initiatives []*state.InitiativeEntry) []*state.Combatant {
	participantMap := make(map[string]*state.Combatant, len(combatants))
	for _, c := range combatants {
		participantMap[c.ID] = c
	}
	sorted := make([]*state.Combatant, 0, len(initiatives))
	for _, entry := range initiatives {
		if c, ok := participantMap[entry.CharacterID]; ok {
			sorted = append(sorted, c)
		}
	}
	return sorted
}

// validateTurn checks that the given combatant is the current turn holder
// in the active combat for the given session. Returns an error if:
//   - the session does not exist
//   - combat is not active
//   - the combatant is not the current turn holder
//
// The caller is responsible for holding the appropriate lock (cm.mu).
func (cm *CombatManager) validateTurn(sessionID, combatantID string) error {
	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	current := cm.getCurrentCombatant(gs.Combat)
	if current == nil {
		return &CombatError{Code: ErrCombatantNotFound, Message: "no current combatant"}
	}
	if current.ID != combatantID {
		return &CombatError{
			Code:    ErrNotYourTurn,
			Message: fmt.Sprintf("not your turn (current turn: %s)", current.ID),
		}
	}
	return nil
}

// checkCombatEnd checks if combat should end (one side fully defeated).
func (cm *CombatManager) checkCombatEnd(cs *state.CombatState) (bool, CombatResult) {
	var playerAlive, enemyAlive bool
	for _, c := range cs.Participants {
		if c.CurrentHP > 0 {
			if c.Type == state.CombatantPlayer {
				playerAlive = true
			} else if c.Type == state.CombatantEnemy {
				enemyAlive = true
			}
		}
	}

	if !enemyAlive && !playerAlive {
		return true, CombatResult{Victory: false, Reason: "mutual destruction"}
	}
	if !enemyAlive {
		return true, CombatResult{Victory: true, Reason: "all enemies defeated"}
	}
	if !playerAlive {
		return true, CombatResult{Victory: false, Reason: "party defeated"}
	}

	return false, CombatResult{}
}

// advanceToNextAliveCombatant advances the turn index past any dead/unconscious
// combatants. Returns the next living combatant, or nil if combat should end.
func (cm *CombatManager) advanceToNextAliveCombatant(cs *state.CombatState) *state.Combatant {
	for i := 0; i < len(cs.Participants); i++ {
		idx := cs.TurnIndex
		if idx >= len(cs.Participants) {
			return nil
		}
		c := cs.Participants[idx]
		if c.CurrentHP > 0 {
			return c
		}
		cs.TurnIndex++
	}
	return nil
}

// now returns current Unix timestamp.
func now() int64 {
	return time.Now().Unix()
}
