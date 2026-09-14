import { useRef } from 'react'

interface Props {
    value: string
    onChange: (val: string) => void
    length?: number
}

export default function OtpInput({ value, onChange, length = 6 }: Props) {
    const inputs = useRef<(HTMLInputElement | null)[]>([])

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(-1)
        const newOtp = value.split('')
        newOtp[index] = val
        const joined = newOtp.join('').slice(0, length)
        onChange(joined)
        if (val && index < length - 1) {
            inputs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        onChange(pasted)
        inputs.current[Math.min(pasted.length, length - 1)]?.focus()
        e.preventDefault()
    }

    return (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={el => { inputs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    style={{
    width: 48, height: 56,
    textAlign: 'center',
    fontSize: '1.4rem', fontWeight: 700,
    border: `2px solid ${value[i] ? 'var(--primary)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', outline: 'none',
    background: 'var(--surface)', color: 'var(--text-primary)',
    transition: 'border-color 0.2s'
}}
                />
            ))}
        </div>
    )
}