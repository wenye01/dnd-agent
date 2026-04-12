// Package spell implements the D&D 5e spell system business logic.
package spell

import "fmt"

// SpellError represents an error in spell operations.
type SpellError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *SpellError) Error() string {
	return e.Message
}

// Error codes
const (
	ErrSpellNotFound       = "SPELL_NOT_FOUND"
	ErrSpellNotKnown       = "SPELL_NOT_KNOWN"
	ErrSpellNotPrepared    = "SPELL_NOT_PREPARED"
	ErrNoAvailableSlot     = "NO_SPELL_SLOT"
	ErrAlreadyConcentrating = "ALREADY_CONCENTRATING"
	ErrInvalidSlotLevel    = "INVALID_SLOT_LEVEL"
	ErrNotConcentrating    = "NOT_CONCENTRATING"
)

// NewSpellError creates a new SpellError with the given code and message.
func NewSpellError(code, message string) *SpellError {
	return &SpellError{Code: code, Message: message}
}

// spellNotFoundf creates a SPELL_NOT_FOUND error with formatted message.
func spellNotFoundf(format string, args ...interface{}) *SpellError {
	return &SpellError{Code: ErrSpellNotFound, Message: fmt.Sprintf(format, args...)}
}

// spellNotKnownf creates a SPELL_NOT_KNOWN error with formatted message.
func spellNotKnownf(format string, args ...interface{}) *SpellError {
	return &SpellError{Code: ErrSpellNotKnown, Message: fmt.Sprintf(format, args...)}
}

// spellNotPreparedf creates a SPELL_NOT_PREPARED error with formatted message.
func spellNotPreparedf(format string, args ...interface{}) *SpellError {
	return &SpellError{Code: ErrSpellNotPrepared, Message: fmt.Sprintf(format, args...)}
}

// noAvailableSlotf creates a NO_SPELL_SLOT error with formatted message.
func noAvailableSlotf(format string, args ...interface{}) *SpellError {
	return &SpellError{Code: ErrNoAvailableSlot, Message: fmt.Sprintf(format, args...)}
}

// invalidSlotLevelf creates an INVALID_SLOT_LEVEL error with formatted message.
func invalidSlotLevelf(format string, args ...interface{}) *SpellError {
	return &SpellError{Code: ErrInvalidSlotLevel, Message: fmt.Sprintf(format, args...)}
}
