// Small form fields shared by the homebrew editors.

import { useState } from 'react'
import { parseDice } from '../lib/dice'

type NumberFieldProps = {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  optional?: boolean  // allows an empty box (value undefined)
  className?: string
}

// A number box that keeps its own text while you type, so it can be cleared and retyped.
// It only reports a value when the text is a whole number (or empty, if optional).
export function NumberField({ label, value, onChange, min, max, optional, className }: NumberFieldProps) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  return (
    <label className={className}>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        required={!optional}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const n = parseInt(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
          else if (optional && e.target.value === '') onChange(undefined)
        }}
      />
    </label>
  )
}

type DiceFieldProps = {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  allowMod?: boolean  // healing dice may end in "+ MOD"
}

// A text box for dice like "2d6+3", with an error shown when the text isn't dice.
export function DiceField({ label, value, onChange, placeholder, allowMod }: DiceFieldProps) {
  const text = value ?? ''
  const checked = allowMod ? text.replace(/\s*\+\s*MOD/i, '') : text
  const invalid = text.trim() !== '' && parseDice(checked) === null
  return (
    <label className={invalid ? 'invalid' : ''}>
      {label}
      <input value={text} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-invalid={invalid} />
      {invalid && <span className="field-error">Write dice like 2d6+3</span>}
    </label>
  )
}
