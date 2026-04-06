package rest

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// mockCharacterStateManager implements CharacterStateManager for testing.
type mockCharacterStateManager struct {
	sessions map[string]*state.GameState
}

func newMockCharacterStateManager() *mockCharacterStateManager {
	return &mockCharacterStateManager{
		sessions: make(map[string]*state.GameState),
	}
}

func (m *mockCharacterStateManager) createTestSession(sessionID string) *state.GameState {
	gs := state.NewGameState(sessionID)
	m.sessions[sessionID] = gs
	return gs
}

// StateManager interface methods
func (m *mockCharacterStateManager) GetSession(sessionID string) interface{} {
	return m.sessions[sessionID]
}

func (m *mockCharacterStateManager) CreateSession(sessionID string) interface{} {
	gs := state.NewGameState(sessionID)
	m.sessions[sessionID] = gs
	return gs
}

func (m *mockCharacterStateManager) DeleteSession(sessionID string) {
	delete(m.sessions, sessionID)
}

func (m *mockCharacterStateManager) ListSessions() []string {
	ids := make([]string, 0, len(m.sessions))
	for id := range m.sessions {
		ids = append(ids, id)
	}
	return ids
}

// CharacterStateManager additional methods
func (m *mockCharacterStateManager) GetGameState(sessionID string) *state.GameState {
	return m.sessions[sessionID]
}

func (m *mockCharacterStateManager) UpdateGameState(sessionID string, updateFn func(*state.GameState)) error {
	gs, ok := m.sessions[sessionID]
	if !ok {
		return state.ErrSessionNotFound
	}
	updateFn(gs)
	return nil
}

// mockPersistence implements Persistence for testing.
type mockPersistence struct {
	sessions map[string]bool
	states   map[string]interface{}
}

func newMockPersistence() *mockPersistence {
	return &mockPersistence{
		sessions: make(map[string]bool),
		states:   make(map[string]interface{}),
	}
}

func (m *mockPersistence) CreateSession(sessionID string) error {
	if m.sessions[sessionID] {
		return nil
	}
	m.sessions[sessionID] = true
	return nil
}

func (m *mockPersistence) DeleteSession(sessionID string) error {
	delete(m.sessions, sessionID)
	delete(m.states, sessionID)
	return nil
}

func (m *mockPersistence) SessionExists(sessionID string) bool {
	return m.sessions[sessionID]
}

func (m *mockPersistence) SaveState(sessionID string, s interface{}) error {
	m.states[sessionID] = s
	return nil
}

func (m *mockPersistence) LoadState(sessionID string) (interface{}, error) {
	s, ok := m.states[sessionID]
	if !ok {
		return nil, nil
	}
	return s, nil
}

func (m *mockPersistence) ListSessions() ([]string, error) {
	ids := make([]string, 0, len(m.sessions))
	for id := range m.sessions {
		ids = append(ids, id)
	}
	return ids, nil
}

// setupTestRouter creates a Gin test router with character routes registered.
func setupTestRouter() (*gin.Engine, *mockCharacterStateManager, *mockPersistence, *zerolog.Logger) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	sm := newMockCharacterStateManager()
	p := newMockPersistence()

	logger := zerolog.Nop()
	l := &logger

	RegisterRoutesWithCharacters(router, sm, nil, p, l)

	return router, sm, p, l
}

// TestRegisterCharacterRoutes verifies that character routes are properly registered.
func TestRegisterCharacterRoutes(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	routes := router.Routes()
	routeMap := make(map[string]bool)
	for _, r := range routes {
		routeMap[r.Method+" "+r.Path] = true
	}

	expectedRoutes := []string{
		"GET /api/health",
		"POST /api/sessions",
		"GET /api/sessions/:id",
		"DELETE /api/sessions/:id",
		"GET /api/sessions",
		"POST /api/characters",
		"GET /api/characters/:id",
		"GET /api/characters",
		"DELETE /api/characters/:id",
		"GET /api/config",
	}

	for _, expected := range expectedRoutes {
		if !routeMap[expected] {
			t.Errorf("Expected route %s not found", expected)
		}
	}
}

// TestCreateCharacter_Success tests creating a character via POST /api/characters.
func TestCreateCharacter_Success(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-1"
	sm.createTestSession(sessionID)

	body := CreateCharacterRequest{
		Name:       "Aragon",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	var resp Response
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Status != "success" {
		t.Errorf("Expected status 'success', got '%s'", resp.Status)
	}

	// Verify character was added to session party
	gs := sm.GetGameState(sessionID)
	if len(gs.Party) != 1 {
		t.Fatalf("Expected party length 1, got %d", len(gs.Party))
	}

	char := gs.Party[0]
	if char.Name != "Aragon" {
		t.Errorf("Expected character name 'Aragon', got '%s'", char.Name)
	}
	if char.Race != "human" {
		t.Errorf("Expected race 'human', got '%s'", char.Race)
	}
	if char.Class != "fighter" {
		t.Errorf("Expected class 'fighter', got '%s'", char.Class)
	}
	// Human fighter with STR 16+1=17: HP = 10 + floor((14+1-10)/2) = 10+2 = 12
	if char.MaxHP != 12 {
		t.Errorf("Expected MaxHP 12, got %d", char.MaxHP)
	}
}

// TestCreateCharacter_SessionIDHeader tests using X-Session-ID header for session identification.
func TestCreateCharacter_SessionIDHeader(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-header"
	sm.createTestSession(sessionID)

	body := CreateCharacterRequest{
		Name:       "Legolas",
		Race:       "elf",
		Class:      "wizard",
		Background: "sage",
		AbilityScores: map[string]int{
			"str": 8, "dex": 14, "con": 12,
			"int": 16, "wis": 12, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Session-ID", sessionID)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	gs := sm.GetGameState(sessionID)
	if len(gs.Party) != 1 {
		t.Errorf("Expected party length 1, got %d", len(gs.Party))
	}
}

// TestCreateCharacter_MissingSessionID tests that missing session ID returns 400.
func TestCreateCharacter_MissingSessionID(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := CreateCharacterRequest{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 10, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestCreateCharacter_InvalidBody tests that invalid JSON body returns 400.
func TestCreateCharacter_InvalidBody(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId=test", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestCreateCharacter_InvalidRace tests that an invalid race returns 400.
func TestCreateCharacter_InvalidRace(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-race"
	sm.createTestSession(sessionID)

	body := CreateCharacterRequest{
		Name:       "Test",
		Race:       "dragonborn",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 10, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for invalid race, got %d", w.Code)
	}
}

// TestCreateCharacter_SessionNotFound tests creating a character in a non-existent session.
func TestCreateCharacter_SessionNotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	body := CreateCharacterRequest{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 10, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId=nonexistent", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for non-existent session, got %d", w.Code)
	}
}

// TestGetCharacter_Success tests retrieving a character by ID.
func TestGetCharacter_Success(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-get"
	gs := sm.createTestSession(sessionID)

	// Add a character to the session party
	char := createTestCharacter("char-1", "Gandalf", "human", "wizard")
	gs.Party = append(gs.Party, char)

	req := httptest.NewRequest(http.MethodGet, "/api/characters/char-1?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}

	var resp Response
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Status != "success" {
		t.Errorf("Expected status 'success', got '%s'", resp.Status)
	}
}

// TestGetCharacter_NotFound tests retrieving a non-existent character.
func TestGetCharacter_NotFound(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-getnf"
	sm.createTestSession(sessionID)

	req := httptest.NewRequest(http.MethodGet, "/api/characters/nonexistent?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

// TestGetCharacter_SessionNotFound tests retrieving from a non-existent session.
func TestGetCharacter_SessionNotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/characters/char-1?sessionId=nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

// TestGetCharacter_MissingSessionID tests GET without session ID.
func TestGetCharacter_MissingSessionID(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/characters/char-1", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestListCharacters_Success tests listing characters in a session.
func TestListCharacters_Success(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-list"
	gs := sm.createTestSession(sessionID)

	gs.Party = append(gs.Party,
		createTestCharacter("char-1", "Aragon", "human", "fighter"),
		createTestCharacter("char-2", "Legolas", "elf", "wizard"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/characters?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}

	var resp Response
	json.Unmarshal(w.Body.Bytes(), &resp)

	data, ok := resp.Data.(map[string]interface{})
	if !ok {
		t.Fatal("Expected data to be a map")
	}

	characters := data["characters"].([]interface{})
	if len(characters) != 2 {
		t.Errorf("Expected 2 characters, got %d", len(characters))
	}

	count := data["count"].(float64)
	if count != 2 {
		t.Errorf("Expected count 2, got %d", int(count))
	}
}

// TestListCharacters_EmptyParty tests listing when party is empty.
func TestListCharacters_EmptyParty(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-empty"
	sm.createTestSession(sessionID)

	req := httptest.NewRequest(http.MethodGet, "/api/characters?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp Response
	json.Unmarshal(w.Body.Bytes(), &resp)

	data := resp.Data.(map[string]interface{})
	characters := data["characters"].([]interface{})
	if len(characters) != 0 {
		t.Errorf("Expected 0 characters, got %d", len(characters))
	}
}

// TestListCharacters_SessionNotFound tests listing from a non-existent session.
func TestListCharacters_SessionNotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/characters?sessionId=nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

// TestListCharacters_MissingSessionID tests list without session ID.
func TestListCharacters_MissingSessionID(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/characters", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestDeleteCharacter_Success tests deleting a character.
func TestDeleteCharacter_Success(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-del"
	gs := sm.createTestSession(sessionID)

	gs.Party = append(gs.Party,
		createTestCharacter("char-1", "Aragon", "human", "fighter"),
		createTestCharacter("char-2", "Legolas", "elf", "wizard"),
	)

	req := httptest.NewRequest(http.MethodDelete, "/api/characters/char-1?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}

	// Verify character was removed from party
	updatedGS := sm.GetGameState(sessionID)
	if len(updatedGS.Party) != 1 {
		t.Fatalf("Expected party length 1 after deletion, got %d", len(updatedGS.Party))
	}
	if updatedGS.Party[0].ID == "char-1" {
		t.Error("Character char-1 should have been deleted")
	}
	if updatedGS.Party[0].ID != "char-2" {
		t.Error("Character char-2 should still be present")
	}
}

// TestDeleteCharacter_NotFound tests deleting a non-existent character.
func TestDeleteCharacter_NotFound(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-delnf"
	sm.createTestSession(sessionID)

	req := httptest.NewRequest(http.MethodDelete, "/api/characters/nonexistent?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

// TestDeleteCharacter_SessionNotFound tests deleting from a non-existent session.
func TestDeleteCharacter_SessionNotFound(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodDelete, "/api/characters/char-1?sessionId=nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

// TestDeleteCharacter_MissingSessionID tests DELETE without session ID.
func TestDeleteCharacter_MissingSessionID(t *testing.T) {
	router, _, _, _ := setupTestRouter()

	req := httptest.NewRequest(http.MethodDelete, "/api/characters/char-1", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestCreateCharacter_QueryOverridesHeader tests that query sessionId takes precedence over header.
func TestCreateCharacter_QueryOverridesHeader(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-query"
	sm.createTestSession(sessionID)

	body := CreateCharacterRequest{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 10, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	// Query param should be used, not header
	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Session-ID", "different-session")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	// Character should be in the session identified by query param
	gs := sm.GetGameState(sessionID)
	if len(gs.Party) != 1 {
		t.Errorf("Expected party length 1 in query-param session, got %d", len(gs.Party))
	}
}

// TestCreateMultipleCharacters tests creating multiple characters in the same session.
func TestCreateMultipleCharacters(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-multi"
	sm.createTestSession(sessionID)

	characters := []CreateCharacterRequest{
		{
			Name: "Fighter", Race: "human", Class: "fighter", Background: "soldier",
			AbilityScores: map[string]int{"str": 16, "dex": 12, "con": 14, "int": 10, "wis": 10, "cha": 10},
		},
		{
			Name: "Wizard", Race: "elf", Class: "wizard", Background: "sage",
			AbilityScores: map[string]int{"str": 8, "dex": 14, "con": 12, "int": 16, "wis": 12, "cha": 10},
		},
		{
			Name: "Rogue", Race: "dwarf", Class: "rogue", Background: "criminal",
			AbilityScores: map[string]int{"str": 10, "dex": 16, "con": 12, "int": 12, "wis": 10, "cha": 8},
		},
	}

	for i, charReq := range characters {
		bodyBytes, _ := json.Marshal(charReq)
		req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Character %d: Expected status 201, got %d; body: %s", i, w.Code, w.Body.String())
		}
	}

	// Verify all 3 characters are in the party
	gs := sm.GetGameState(sessionID)
	if len(gs.Party) != 3 {
		t.Fatalf("Expected party length 3, got %d", len(gs.Party))
	}

	names := make(map[string]bool)
	for _, c := range gs.Party {
		names[c.Name] = true
	}

	for _, expected := range []string{"Fighter", "Wizard", "Rogue"} {
		if !names[expected] {
			t.Errorf("Expected character '%s' in party", expected)
		}
	}
}

// createTestCharacter creates a simple test character model.
func createTestCharacter(id, name, race, class string) *models.Character {
	return &models.Character{
		ID:         id,
		Name:       name,
		Race:       race,
		Class:      class,
		Level:      1,
		Background: "soldier",
		Stats: models.AbilityScores{
			Strength:     10,
			Dexterity:    10,
			Constitution: 10,
			Intelligence: 10,
			Wisdom:       10,
			Charisma:     10,
		},
		MaxHP:            10,
		HP:               10,
		AC:               10,
		Speed:            30,
		ProficiencyBonus: 2,
		Skills:           map[types.Skill]bool{},
		SavingThrows:     map[types.Ability]bool{},
		Conditions:       []types.Condition{},
		Inventory:        []models.Item{},
		RacialTraits:     []models.RaceTrait{},
	}
}

// mockBroadcaster captures messages sent via the Broadcaster interface.
type mockBroadcaster struct {
	messages []broadcastMessage
}

type broadcastMessage struct {
	sessionID string
	message   *models.ServerMessage
}

func (m *mockBroadcaster) SendToSession(sessionID string, message *models.ServerMessage) {
	m.messages = append(m.messages, broadcastMessage{
		sessionID: sessionID,
		message:   message,
	})
}

// setupTestRouterWithBroadcaster creates a test router with a mock broadcaster.
func setupTestRouterWithBroadcaster() (*gin.Engine, *mockCharacterStateManager, *mockBroadcaster, *zerolog.Logger) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	sm := newMockCharacterStateManager()
	b := &mockBroadcaster{}

	logger := zerolog.Nop()
	l := &logger

	RegisterRoutesWithCharacters(router, sm, b, newMockPersistence(), l)

	return router, sm, b, l
}

// TestCreateCharacter_BroadcastsStateUpdate verifies that creating a character
// sends a state_update WebSocket message with stateType "party" to the session.
func TestCreateCharacter_BroadcastsStateUpdate(t *testing.T) {
	router, sm, b, _ := setupTestRouterWithBroadcaster()
	sessionID := "test-session-broadcast"
	sm.createTestSession(sessionID)

	body := CreateCharacterRequest{
		Name:       "Aragon",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	// Verify a broadcast message was sent
	if len(b.messages) != 1 {
		t.Fatalf("Expected 1 broadcast message, got %d", len(b.messages))
	}

	msg := b.messages[0]
	if msg.sessionID != sessionID {
		t.Errorf("Expected sessionID '%s', got '%s'", sessionID, msg.sessionID)
	}
	if msg.message.Type != models.MsgTypeStateUpdate {
		t.Errorf("Expected message type '%s', got '%s'", models.MsgTypeStateUpdate, msg.message.Type)
	}

	// Verify payload structure matches frontend isStateUpdatePayload type guard
	payload, ok := msg.message.Payload.(map[string]interface{})
	if !ok {
		t.Fatal("Expected payload to be a map")
	}
	if payload["stateType"] != "party" {
		t.Errorf("Expected stateType 'party', got '%v'", payload["stateType"])
	}
	if payload["data"] == nil {
		t.Error("Expected data to be present in payload")
	}

	// Verify data contains the party array
	party, ok := payload["data"].([]*models.Character)
	if !ok {
		t.Error("Expected data to be a character array")
	}
	if len(party) != 1 {
		t.Errorf("Expected party length 1, got %d", len(party))
	}
	if party[0].Name != "Aragon" {
		t.Errorf("Expected character name 'Aragon', got '%s'", party[0].Name)
	}
}

// TestDeleteCharacter_BroadcastsStateUpdate verifies that deleting a character
// sends a state_update WebSocket message with the updated party.
func TestDeleteCharacter_BroadcastsStateUpdate(t *testing.T) {
	router, sm, b, _ := setupTestRouterWithBroadcaster()
	sessionID := "test-session-del-broadcast"
	gs := sm.createTestSession(sessionID)

	gs.Party = append(gs.Party,
		createTestCharacter("char-1", "Aragon", "human", "fighter"),
		createTestCharacter("char-2", "Legolas", "elf", "wizard"),
	)

	req := httptest.NewRequest(http.MethodDelete, "/api/characters/char-1?sessionId="+sessionID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}

	// Verify a broadcast message was sent
	if len(b.messages) != 1 {
		t.Fatalf("Expected 1 broadcast message, got %d", len(b.messages))
	}

	msg := b.messages[0]
	if msg.message.Type != models.MsgTypeStateUpdate {
		t.Errorf("Expected message type '%s', got '%s'", models.MsgTypeStateUpdate, msg.message.Type)
	}

	payload, ok := msg.message.Payload.(map[string]interface{})
	if !ok {
		t.Fatal("Expected payload to be a map")
	}
	if payload["stateType"] != "party" {
		t.Errorf("Expected stateType 'party', got '%v'", payload["stateType"])
	}

	party, ok := payload["data"].([]*models.Character)
	if !ok {
		t.Error("Expected data to be a character array")
	}
	if len(party) != 1 {
		t.Errorf("Expected party length 1 after deletion, got %d", len(party))
	}
	if party[0].ID != "char-2" {
		t.Errorf("Expected remaining character 'char-2', got '%s'", party[0].ID)
	}
}

// TestCreateCharacter_FullNameAbilityScores tests that full ability names work via HTTP.
func TestCreateCharacter_FullNameAbilityScores(t *testing.T) {
	router, sm, _, _ := setupTestRouter()
	sessionID := "test-session-fullnames"
	sm.createTestSession(sessionID)

	body := map[string]interface{}{
		"name":       "Aragon",
		"race":       "human",
		"class":      "fighter",
		"background": "soldier",
		"abilityScores": map[string]int{
			"strength": 16, "dexterity": 12, "constitution": 14,
			"intelligence": 10, "wisdom": 10, "charisma": 10,
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/characters?sessionId="+sessionID, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	gs := sm.GetGameState(sessionID)
	if len(gs.Party) != 1 {
		t.Fatalf("Expected party length 1, got %d", len(gs.Party))
	}

	char := gs.Party[0]
	// Human +1 to all: STR 17, DEX 13, CON 15
	// HP: 10 (fighter hit dice) + 2 (CON 15 = +2 mod) = 12
	if char.MaxHP != 12 {
		t.Errorf("Expected MaxHP 12 (with human CON bonus), got %d", char.MaxHP)
	}
	// AC: 10 + 1 (DEX 13 = +1 mod) = 11
	if char.AC != 11 {
		t.Errorf("Expected AC 11 (with human DEX bonus), got %d", char.AC)
	}
	if char.Stats.Strength != 17 {
		t.Errorf("Expected Strength 17 (16+1 human bonus), got %d", char.Stats.Strength)
	}
}
