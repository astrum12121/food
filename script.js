// Данные товаров (локальные изображения)
const products = [
    { id: 1, name: 'Маргарита', description: 'Сыр моцарелла, томатный соус, базилик', price: 450, category: 'pizza', image: 'images/pizza-margherita.jpg' },
    { id: 2, name: 'Пепперони', description: 'Острая колбаса пепперони, сыр, томатный соус', price: 520, category: 'pizza', image: 'images/pizza-pepperoni.jpg' },
    { id: 3, name: 'Чизбургер', description: 'Котлета из говядины, сыр чеддер, салат, помидор, соус', price: 380, category: 'burger', image: 'images/cheeseburger.jpg' },
    { id: 4, name: 'Бургер с беконом', description: 'Котлета, бекон, сыр, карамелизированный лук', price: 450, category: 'burger', image: 'images/bacon-burger.jpg' },
    { id: 5, name: 'Додстер', description: 'Куриное филе, сыр, соус, свежие овощи', price: 490, category: 'zakus', image: 'images/dodster.jpg' },
    { id: 6, name: 'Дэнвич', description: 'Котлета из говядины, сыр, бекон, соус BBQ', price: 520, category: 'zakus', image: 'images/denvich.jpg' },
    { id: 7, name: 'Кола', description: 'Напиток прохладительный 0.5л', price: 120, category: 'drink', image: 'images/cola.jpg' },
    { id: 8, name: 'Сок апельсиновый', description: 'Свежевыжатый 0.3л', price: 180, category: 'drink', image: 'images/orange-juice.jpg' },
    { id: 9, name: 'Лимонад', description: 'Домашний лимонад 0.5л', price: 150, category: 'drink', image: 'images/lemonade.jpg' },
    { id: 10, name: 'Минеральная вода', description: 'Газированная 0.5л', price: 100, category: 'drink', image: 'images/mineral-water.jpg' }

];

// Корзина
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// DOM элементы
const productsGrid = document.getElementById('productsGrid');
const cartCount = document.getElementById('cartCount');
const cartIcon = document.getElementById('cartIcon');
const cartModal = document.getElementById('cartModal');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsDiv = document.getElementById('cartItems');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const clearCartBtn = document.getElementById('clearCartBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const checkoutForm = document.getElementById('checkoutForm');
const categoryFilter = document.getElementById('categoryFilter');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

let currentCategory = 'all';

// --- Вспомогательные функции ---
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// --- Логика акции 2=3 для напитков ---
function applyDrinkPromo() {
    // 1. Собираем все напитки в плоский список с учётом количества
    let drinkItems = [];
    cart.forEach(item => {
        if (item.category === 'drink') {
            for (let i = 0; i < item.quantity; i++) {
                drinkItems.push({
                    id: item.id,
                    name: item.name,
                    originalPrice: item.originalPrice || item.price,
                    image: item.image
                });
            }
        }
    });
    // 2. Сортируем по времени добавления (если есть addedAt), иначе сохраняем порядок
    // Для этого в момент добавления напитка сохраняем timestamp в item.addedAt
    // Но если у старых элементов его нет, оставим как есть.
    drinkItems.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

    // 3. Определяем, какие позиции должны быть бесплатными (каждый третий)
    const freePositions = [];
    for (let i = 2; i < drinkItems.length; i += 3) {
        freePositions.push(i);
    }

    // 4. Пересобираем карту цен: для каждого товара (по id) определяем, сколько платных и сколько бесплатных
    const priceMap = new Map(); // key: id, value: { totalPrice, freeCount }
    drinkItems.forEach((item, idx) => {
        const isFree = freePositions.includes(idx);
        if (!priceMap.has(item.id)) {
            priceMap.set(item.id, { totalPrice: 0, freeCount: 0 });
        }
        const entry = priceMap.get(item.id);
        if (isFree) {
            entry.freeCount++;
        } else {
            entry.totalPrice += item.originalPrice;
        }
    });

    // 5. Применяем цены к элементам корзины
    cart.forEach(item => {
        if (item.category === 'drink') {
            const entry = priceMap.get(item.id);
            if (entry) {
                const paidCount = item.quantity - entry.freeCount;
                item.price = paidCount * (item.originalPrice || item.price);
                // Сохраняем originalPrice для последующих пересчётов
                if (!item.originalPrice) item.originalPrice = item.price;
            } else {
                // Если нет данных, всё платное
                item.price = item.quantity * (item.originalPrice || item.price);
            }
        }
    });

    // Обновляем корзину
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

// --- Добавление товара в корзину ---
function addToCart(productId, productName, productPrice, productImage, category = '') {
    const existing = cart.find(item => item.id == productId); // id может быть строкой
    if (existing) {
        existing.quantity += 1;
        // Если это напиток, обновляем метку времени для последнего добавления (чтобы сохранить порядок)
        if (category === 'drink') {
            existing.addedAt = Date.now(); // обновляем время последнего добавления
            applyDrinkPromo();
        } else {
            saveCart();
        }
        return;
    }

    const newItem = {
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage,
        quantity: 1,
        category: category
    };
    if (category === 'drink') {
        newItem.originalPrice = productPrice;
        newItem.addedAt = Date.now();
        cart.push(newItem);
        applyDrinkPromo();
    } else {
        cart.push(newItem);
        saveCart();
    }
}

// --- Отображение корзины ---
function renderCart() {
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align:center">Корзина пуста</p>';
        cartTotalPrice.textContent = '0 ₽';
        return;
    }

    cartItemsDiv.innerHTML = cart.map(item => {
        let displayPrice = item.price + ' ₽';
        if (item.category === 'drink' && item.price === 0) {
            displayPrice = '0 ₽ (бесплатно)';
        } else if (item.category === 'drink' && item.price > 0 && item.quantity > 0) {
            // показываем среднюю цену за штуку (для информации)
            const avgPrice = Math.round(item.price / item.quantity);
            displayPrice = `${item.price} ₽ (≈${avgPrice} ₽/шт.)`;
        }
        return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item__image">
                <div class="cart-item__info">
                    <div class="cart-item__title">${item.name}</div>
                    <div class="cart-item__price">${displayPrice}</div>
                </div>
                <div class="cart-item__controls">
                    <button class="cart-item__decrement" data-id="${item.id}">-</button>
                    <span class="cart-item__quantity">${item.quantity}</span>
                    <button class="cart-item__increment" data-id="${item.id}">+</button>
                    <button class="cart-item__remove" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotalPrice.textContent = total + ' ₽';
}

// --- Обработчики событий ---
cartIcon.addEventListener('click', () => {
    renderCart();
    cartModal.classList.add('show');
});

closeCartBtn.addEventListener('click', () => cartModal.classList.remove('show'));
cartOverlay.addEventListener('click', () => cartModal.classList.remove('show'));

clearCartBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    cart = [];
    saveCart();
    showToast('Корзина очищена');
});

// Обработка изменения корзины (+, -, удаление)
cartItemsDiv.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const itemDiv = target.closest('.cart-item');
    if (!itemDiv) return;
    const id = itemDiv.dataset.id;
    const cartItem = cart.find(item => item.id == id);
    if (!cartItem) return;

    if (target.classList.contains('cart-item__increment')) {
        cartItem.quantity += 1;
        if (cartItem.category === 'drink') {
            cartItem.addedAt = Date.now(); // обновляем время для порядка
            applyDrinkPromo();
        } else {
            saveCart();
        }
    } else if (target.classList.contains('cart-item__decrement')) {
        if (cartItem.quantity > 1) {
            cartItem.quantity -= 1;
            if (cartItem.category === 'drink') {
                // При уменьшении количества порядок не меняется, просто пересчитываем цены
                applyDrinkPromo();
            } else {
                saveCart();
            }
        } else {
            cart = cart.filter(item => item.id != id);
            if (cartItem.category === 'drink') {
                applyDrinkPromo();
            } else {
                saveCart();
            }
        }
    } else if (target.classList.contains('cart-item__remove')) {
        cart = cart.filter(item => item.id != id);
        if (cartItem.category === 'drink') {
            applyDrinkPromo();
        } else {
            saveCart();
        }
    }
});

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        showToast('Корзина пуста');
        return;
    }
    cartModal.classList.remove('show');
    checkoutModal.classList.add('show');
});

closeCheckoutBtn.addEventListener('click', () => checkoutModal.classList.remove('show'));
checkoutOverlay.addEventListener('click', () => checkoutModal.classList.remove('show'));

checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Заказ оформлен! Спасибо за покупку');
    cart = [];
    saveCart();
    checkoutModal.classList.remove('show');
    checkoutForm.reset();
});

// Фильтрация товаров
categoryFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (!btn) return;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    renderProducts();
});

function renderProducts() {
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);
    productsGrid.innerHTML = filtered.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image}" alt="${product.name}" class="product-card__image">
            <div class="product-card__body">
                <h3 class="product-card__title">${product.name}</h3>
                <p class="product-card__description">${product.description}</p>
                <div class="product-card__footer">
                    <span class="product-card__price">${product.price} ₽</span>
                    <button class="add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

productsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const name = btn.dataset.name;
    const price = parseInt(btn.dataset.price);
    const product = products.find(p => p.id === id);
    if (!product) return;
    addToCart(id, name, price, product.image, product.category);
});

// Мобильное меню
mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
});
mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        mobileMenu.classList.remove('show');
    }
});

// --- Логика акции «2=3»: модальное окно выбора напитка ---
const drinkPrices = {
    'Кола': 120,
    'Сок апельсиновый': 180,
    'Лимонад': 150,
    'Минеральная вода': 100
};

// Создаём модальное окно, если его нет
let drinkModal = document.getElementById('drinkModal');
if (!drinkModal) {
    const modalHTML = `
        <div class="drink-modal" id="drinkModal">
            <div class="drink-modal__overlay" id="drinkOverlay"></div>
            <div class="drink-modal__content">
                <h3>Выберите напиток</h3>
                <form id="drinkForm">
                    <div class="drink-options">
                        <label class="drink-option"><input type="radio" name="drink" value="Кола" checked> Кола</label>
                        <label class="drink-option"><input type="radio" name="drink" value="Сок апельсиновый"> Сок апельсиновый</label>
                        <label class="drink-option"><input type="radio" name="drink" value="Лимонад"> Лимонад</label>
                        <label class="drink-option"><input type="radio" name="drink" value="Минеральная вода"> Минеральная вода</label>
                    </div>
                    <div class="drink-modal__buttons">
                        <button type="submit" class="btn btn--primary">Добавить в корзину</button>
                        <button type="button" class="btn btn--secondary" id="closeDrinkBtn">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    drinkModal = document.getElementById('drinkModal');
}

const drinkOverlay = document.getElementById('drinkOverlay');
const closeDrinkBtn = document.getElementById('closeDrinkBtn');
const drinkForm = document.getElementById('drinkForm');

function openDrinkModal() { drinkModal.classList.add('show'); }
function closeDrinkModal() { drinkModal.classList.remove('show'); }

if (closeDrinkBtn) closeDrinkBtn.addEventListener('click', closeDrinkModal);
if (drinkOverlay) drinkOverlay.addEventListener('click', closeDrinkModal);

if (drinkForm) {
    drinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = document.querySelector('input[name="drink"]:checked');
        if (!selected) return;
        const drinkName = selected.value;
        const drinkPrice = drinkPrices[drinkName];
        const drinkId = `drink_${drinkName.replace(/\s/g, '_')}`;
        const drinkImage = `images/${drinkName.toLowerCase().replace(/ /g, '-')}.jpg`;
        addToCart(drinkId, drinkName, drinkPrice, drinkImage, 'drink');
        closeDrinkModal();
        showToast(`Напиток «${drinkName}» добавлен в корзину`);
    });
}

// Обработка кнопок акций
document.querySelectorAll('.promo__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.classList.contains('promo__btn--drink')) {
            openDrinkModal();
            return;
        }
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = parseInt(btn.dataset.price);
        const promoCard = btn.closest('.promo__card');
        const image = promoCard.querySelector('.promo__image').src;
        addToCart(id, name, price, image, 'promo');
    });
});

// Инициализация: для всех напитков добавим поле originalPrice и addedAt, если их нет
cart.forEach(item => {
    if (item.category === 'drink') {
        if (!item.originalPrice) item.originalPrice = item.price;
        if (!item.addedAt) item.addedAt = Date.now();
    }
});
applyDrinkPromo(); // пересчёт цен при загрузке
renderProducts();
updateCartCount();