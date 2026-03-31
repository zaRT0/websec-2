export default function Input({
    value,
    onChange,
    placeholder,
    type = 'text',
    disabled = false,
    className = '',
    id = ''
}) {
    return (
        <input
            id={id}
            type={type}
            className={`form__input ${className}`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
        />
    );
}