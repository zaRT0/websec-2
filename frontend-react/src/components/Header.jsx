import { useState } from 'react';

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="header">
            <div className="header__container container">
                <div className="header__logo">
                    <span className="logo__icon">🚃</span>
                    <h1 className="logo__title">Электрички РФ</h1>
                </div>

                <nav className={`header__nav ${menuOpen ? 'active' : ''}`}>
                    <ul className="nav__list">
                        <li><a href="#search" className="nav__link">Поиск</a></li>
                        <li><a href="#favorites" className="nav__link">Избранное</a></li>
                        <li><a href="#about" className="nav__link">О сервисе</a></li>
                    </ul>
                </nav>

                <button
                    className="header__menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span className="menu-toggle__line"></span>
                    <span className="menu-toggle__line"></span>
                    <span className="menu-toggle__line"></span>
                </button>
            </div>
        </header>
    );
}