// Package models provides the core data models for the D&D game.
package models

// GameMap represents a map/area in the game world.
type GameMap struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Width       int            `json:"width"`
	Height      int            `json:"height"`
	GridType    string         `json:"gridType"` // square, hex
	Tiles       [][]Tile       `json:"tiles"`
	Walls       []Wall         `json:"walls,omitempty"`
	Objects     []MapObject    `json:"objects,omitempty"`
	Connections []MapConnection `json:"connections,omitempty"`
	Entrances   []Entrance     `json:"entrances,omitempty"`
	Exits       []Exit         `json:"exits,omitempty"`
}

// Tile represents a single tile on the map.
type Tile struct {
	Position Position `json:"position"`
	Type     string   `json:"type"`     // floor, wall, water, pit, stairs, etc.
	Walkable bool     `json:"walkable"`
	Difficult bool    `json:"difficult"` // difficult terrain
	Image    string   `json:"image,omitempty"`
}

// Wall represents a wall segment on the map.
type Wall struct {
	ID    string   `json:"id"`
	Start Position `json:"start"`
	End   Position `json:"end"`
	Type  string   `json:"type"` // stone, wood, fence, etc.
	Door  *Door    `json:"door,omitempty"`
}

// Door represents a door within a wall.
type Door struct {
	ID     string `json:"id"`
	State  string `json:"state"` // open, closed, locked
	Locked bool   `json:"locked"`
	KeyID  string `json:"keyId,omitempty"`
	DC     int    `json:"dc,omitempty"` // DC to force open
}

// MapObject represents an interactive or decorative object on the map.
type MapObject struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Position    Position               `json:"position"`
	Size        Size                   `json:"size"`
	Type        string                 `json:"type"` // furniture, container, trap, decoration, etc.
	Interactive bool                   `json:"interactive"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
}

// MapConnection represents a connection between maps.
type MapConnection struct {
	TargetMapID    string `json:"targetMapId"`
	TargetEntrance string `json:"targetEntrance"`
}

// Entrance represents an entry point on a map.
type Entrance struct {
	ID        string   `json:"id"`
	Position  Position `json:"position"`
	Direction string   `json:"direction"` // north, south, east, west
}

// Exit represents an exit point from a map to another map.
type Exit struct {
	ID             string   `json:"id"`
	Position       Position `json:"position"`
	TargetMapID    string   `json:"targetMapId"`
	TargetEntrance string   `json:"targetEntrance"`
}
