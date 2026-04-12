// Package models provides the core data models for the D&D game.
package models

import "encoding/json"

// Scenario represents a complete adventure scenario/campaign.
type Scenario struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Version        string   `json:"version"`
	LevelRange    [2]int   `json:"levelRange"`
	Chapters      []Chapter `json:"chapters"`
	NPCs          []NPCTemplate `json:"npcs,omitempty"`
	Maps          []string `json:"maps"`
	StartChapter  string   `json:"startChapter"`
	StartScene    string   `json:"startScene"`
	StartMap      string   `json:"startMap"`
	StartPosition Position `json:"startPosition"`
}

// Chapter represents a chapter within a scenario.
type Chapter struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	Description       string     `json:"description"`
	Order             int        `json:"order"`
	Scenes            []Scene    `json:"scenes"`
	CompletionCondition *Condition `json:"completionCondition,omitempty"`
}

// Scene represents a scene within a chapter.
type Scene struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	MapID        string        `json:"mapId"`
	EntranceID   string        `json:"entranceId"`
	NPCs         []string      `json:"npcs,omitempty"`
	Enemies      []string      `json:"enemies,omitempty"`
	Triggers     []Trigger     `json:"triggers,omitempty"`
	Interactables []Interactable `json:"interactables,omitempty"`
	Exits        []SceneExit   `json:"exits,omitempty"`
}

// Trigger represents an event trigger in a scene.
type Trigger struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Enabled   bool      `json:"enabled"`
	OneTime   bool      `json:"oneTime"`
	Condition Condition `json:"condition"`
	Actions   []Action  `json:"actions"`
	Triggered bool      `json:"triggered"`
}

// Condition represents a conditional check for triggers and completion.
type Condition struct {
	Type   string                 `json:"type"`
	Params map[string]interface{} `json:"params,omitempty"`
	And    []Condition            `json:"and,omitempty"`
	Or     []Condition            `json:"or,omitempty"`
}

// Action represents an action to execute when a trigger fires.
type Action struct {
	Type   string                 `json:"type"`
	Params map[string]interface{} `json:"params,omitempty"`
	Delay  int                    `json:"delay,omitempty"` // delay in rounds
}

// Interactable represents an interactive element in a scene.
type Interactable struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	Position   Position               `json:"position"`
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// SceneExit represents a transition point between scenes.
type SceneExit struct {
	ID             string   `json:"id"`
	Position       Position `json:"position"`
	TargetChapterID string  `json:"targetChapterId"`
	TargetSceneID  string   `json:"targetSceneId"`
}

// NPCTemplate defines a reusable NPC blueprint.
type NPCTemplate struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	Race       string          `json:"race"`
	Class      string          `json:"class"`
	Level      int             `json:"level"`
	Disposition string         `json:"disposition"` // friendly, neutral, hostile
	DialogTree json.RawMessage `json:"dialogTree,omitempty"`
}

// ConditionType constants for trigger conditions.
const (
	ConditionTypeEnterArea    = "enter_area"
	ConditionTypeKillEnemy    = "kill_enemy"
	ConditionTypeTalkToNPC    = "talk_to_npc"
	ConditionTypeInteract     = "interact"
	ConditionTypeItemAcquired = "item_acquired"
	ConditionTypeFlagSet      = "flag_set"
	ConditionTypeHPThreshold  = "hp_threshold"
	ConditionTypeCustom       = "custom"
)

// ActionType constants for trigger actions.
const (
	ActionTypeSpawnEnemy    = "spawn_enemy"
	ActionTypeShowDialog    = "show_dialog"
	ActionTypeGiveItem      = "give_item"
	ActionTypeSetFlag       = "set_flag"
	ActionTypeChangeScene   = "change_scene"
	ActionTypePlaySound     = "play_sound"
	ActionTypeApplyEffect   = "apply_effect"
	ActionTypeSendMessage   = "send_message"
	ActionTypeCustom        = "custom"
)
