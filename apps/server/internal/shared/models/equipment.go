// Package models provides the core data models for the D&D game.
package models

// NewEquipment creates an empty Equipment with all slots initialized.
func NewEquipment() *Equipment {
	return &Equipment{
		Slots: make(map[EquipmentSlot]*InventoryItem),
	}
}

// NewInventoryData creates empty InventoryData.
func NewInventoryData() *InventoryData {
	return &InventoryData{
		Items:    make([]InventoryItem, 0),
		Capacity: 100,
	}
}

// TotalWeight returns the total weight of all items in inventory.
func (inv *InventoryData) TotalWeight() float64 {
	total := 0.0
	for _, item := range inv.Items {
		total += item.Weight * float64(item.Quantity)
	}
	return total
}

// TotalValue returns the total value of all items in inventory (in copper pieces).
func (inv *InventoryData) TotalValue() int {
	total := inv.Copper + inv.Silver*10 + inv.Gold*100
	for _, item := range inv.Items {
		total += item.Value * item.Quantity
	}
	return total
}
