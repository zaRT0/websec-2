export default function Loader({ text = 'Загрузка...' }) {
    return (
        <div className="loader">
            <div className="loader__spinner"></div>
            <div className="loader__text">{text}</div>
        </div>
    );
}