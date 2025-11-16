document.addEventListener('DOMContentLoaded', function () {
    const staffSellSection = document.querySelector('.staff-sell-section');
    if (!staffSellSection) return;

    let cart = {};
    const sizePriceMap = { S: 2.00, M: 2.25, L: 2.50 };
    const EXCHANGE_RATE = 4100;
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterSubBtns = document.querySelectorAll('.filter-sub-btn');
    const filterNameBtns = document.querySelectorAll('.filter-name-btn');
    const productWrappers = document.querySelectorAll('.product-wrapper');
    const checkoutBtn = document.querySelector('#checkout');
    const walletEl = document.getElementById('wallet-balance');

    let selectedType = 'all', selectedSubType = 'all', selectedName = 'all';

    function showToast(msg, icon = 'success') {
        Swal.fire({ title: msg, icon, timer: 1400, showConfirmButton: false, position: 'center' });
    }

    // ===== Product Filter =====
    function filterProducts() {
        productWrappers.forEach(wrapper => {
            const type = wrapper.dataset.type;
            const subtype = (wrapper.dataset.subtype || '').toLowerCase();
            const name = (wrapper.dataset.name || '').toLowerCase();

            const matchType = selectedType === 'all' || selectedType === type;
            const matchSub = selectedSubType === 'all' || subtype.includes(selectedSubType);
            const matchName = selectedName === 'all' || name.includes(selectedName);

            wrapper.style.display = (matchType && matchSub && matchName) ? 'block' : 'none';
        });
    }

    filterBtns.forEach(btn => btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
        filterProducts();
    }));

    filterSubBtns.forEach(btn => btn.addEventListener('click', () => {
        filterSubBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSubType = btn.dataset.subtype.toLowerCase();
        filterProducts();
    }));

    filterNameBtns.forEach(btn => btn.addEventListener('click', () => {
        filterNameBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedName = btn.dataset.name.toLowerCase();
        filterProducts();
    }));

    filterProducts();

    // ===== Wallet =====
    function updateWalletBalance(amount = 0) {
        if (!walletEl) return;
        let current = parseFloat(walletEl.dataset.balance) || 0;
        current += amount;
        walletEl.dataset.balance = current.toFixed(2);
        walletEl.textContent = '$' + current.toFixed(2);
    }

function getAvailableStock(id, size, sugar) {
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (!card) return 0;

    const key = `available_${size.toLowerCase()}`;
    const totalStock = parseInt((card.dataset[key] || '0').trim()) || 0;

    // Only subtract cart quantity for this exact size+sugar
    const cartKey = `${id}_${size}_${sugar}`;
    const usedInCart = cart[cartKey] ? cart[cartKey].quantity : 0;

    return totalStock - usedInCart;
}


    // ===== Add / Remove Products =====
    staffSellSection.addEventListener('click', function (e) {
        const target = e.target;

        // --- Select Size ---
        if (target.classList.contains('size-btn')) {
            const group = target.closest('.btn-group');
            group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            target.classList.add('active');

            const card = target.closest('.product-card');
            const size = target.dataset.size;
            card.querySelector('.product-price').textContent = `$${sizePriceMap[size].toFixed(2)}`;
        }

        // --- Add to Cart ---
        const addBtn = target.closest('.btn-add-to-cart');
        if (addBtn) {
            const card = addBtn.closest('.product-card');
            const id = card.dataset.id;
            const name = card.dataset.name;

            if (parseInt(card.dataset.missingRawMaterials)) {
                Swal.fire('Warning', `${name} cannot be added: missing raw materials`, 'warning');
                return;
            }

            const sizeBtn = card.querySelector('.size-btn.active');
            const size = sizeBtn ? sizeBtn.dataset.size : null;
            const sugarSelect = card.querySelector('select');
            const sugar = sugarSelect ? sugarSelect.value : null;
            const qtyInput = parseInt(card.querySelector('.qty-input')?.value) || 1;

            if (!size || !sugar) {
                Swal.fire('Error', 'Select size & sugar', 'error');
                return;
            }

           const available = getAvailableStock(id, size, sugar);
if (qtyInput > available) {
    Swal.fire('Error', `Not enough stock for ${name} (${size})`, 'error');
    return;
}

            const key = `${id}_${size}_${sugar}`;
            if (cart[key]) cart[key].quantity += qtyInput;
            else cart[key] = { id, name, size, sugar, unit_price: sizePriceMap[size], quantity: qtyInput };

            renderCart();
            updateStockUI(card);
            Swal.fire('Added', `${name} (${size}, ${sugar}) x${qtyInput} added!`, 'success');
        }
    });

 // ===== Render Cart =====
function renderCart() {
    const tbody = document.querySelector('#cart-table tbody');
    tbody.innerHTML = '';
    let total = 0;

    Object.values(cart).forEach(item => {
        const lineTotal = item.unit_price * item.quantity;
        total += lineTotal;

        tbody.innerHTML += `
            <tr data-key="${item.id}_${item.size}_${item.sugar}">
                <td>${item.name}</td>
                <td>${item.size}</td>
                <td>${item.sugar}</td>
                <td>
                    <button class="btn btn-sm btn-outline-light qty-btn" data-action="decrease">-</button>
                    <span class="mx-1">${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-light qty-btn" data-action="increase">+</button>
                </td>
                <td>$${lineTotal.toFixed(2)}</td>
            </tr>`;
    });

    if (Object.keys(cart).length > 0) {
        const totalKHR = total * EXCHANGE_RATE;
        tbody.innerHTML += `
            <tr>
                <td colspan="4" class="text-end fw-bold">Total (USD):</td>
                <td class="fw-bold">$${total.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="4" class="text-end fw-bold text-warning">Total (KHR):</td>
                <td class="fw-bold text-warning">៛${totalKHR.toLocaleString()}</td>
            </tr>`;
    }

    // ===== Qty Buttons =====
    tbody.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tr = btn.closest('tr');
            const key = tr.dataset.key;
            if (!cart[key]) return;

            const item = cart[key];
            const action = btn.dataset.action;
            const available = getAvailableStock(item.id, item.size, item.sugar);

            if (action === 'increase') {
                if (item.quantity < available) item.quantity++;
                else showToast(`Not enough stock for ${item.name} (${item.size})`, 'error');
            } else if (action === 'decrease') {
                item.quantity--;
                if (item.quantity <= 0) delete cart[key];
            }

            renderCart();

            // Update stock UI
            const card = document.querySelector(`.product-card[data-id="${item.id}"]`);
            if (card) updateStockUI(card);
        });
    });
}


function updateStockUI(card) {
    ['S','M','L'].forEach(size => {
        const span = card.querySelector(`.available-stock-${size.toLowerCase()}`);
        if (!span) return;

        // sum all quantities in cart for this size (all sugars)
        const used = Object.values(cart)
            .filter(item => item.id === card.dataset.id && item.size === size)
            .reduce((sum, item) => sum + item.quantity, 0);

        const totalStock = parseInt(card.dataset[`available_${size.toLowerCase()}`] || 0);
        span.textContent = totalStock - used;
    });
}



    // ===== Checkout =====
    checkoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        if (Object.keys(cart).length === 0) { showToast('Cart empty', 'error'); return; }

        const total = Object.values(cart).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
        const totalKHR = total * EXCHANGE_RATE;
        const paymentMethod = document.querySelector('#payment_method')?.value || 'Cash';

        const result = await Swal.fire({
            title: '🧾 Checkout Confirmation',
            html: `<div style="max-height:300px;overflow-y:auto;text-align:left;">
                <table class="table table-sm">
                    <thead><tr><th>Product</th><th>Size</th><th>Sugar</th><th>Qty</th><th>Price</th></tr></thead>
                    <tbody>
                        ${Object.values(cart).map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.size}</td>
                                <td>${item.sugar}</td>
                                <td>${item.quantity}</td>
                                <td>$${(item.unit_price*item.quantity).toFixed(2)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                <hr>
                <div class="text-end">
                    <p><strong>Total (USD):</strong> $${total.toFixed(2)}</p>
                    <p class="text-warning"><strong>Total (KHR):</strong> ៛${totalKHR.toLocaleString()}</p>
                </div>
            </div>`,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '🖨️ Print Invoice',
            denyButtonText: '💾 Confirm Checkout',
            cancelButtonText: '❌ Cancel',
            width: 700,
        });

        if (result.isConfirmed) printInvoice(cart, total, totalKHR, paymentMethod);
        else if (result.isDenied) {
            try {
                const response = await fetch(checkoutUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({ cart_data: JSON.stringify(cart), payment_method: paymentMethod }),
                    credentials: 'same-origin'
                });
                const data = await response.json();
                if (data.success) {
                    // Update stock from backend
                    Object.entries(data.updated_stock).forEach(([id, stockBySize]) => {
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (!card) return;
    ['S','M','L'].forEach(size => {
        const qty = (stockBySize && stockBySize[size] != null) ? stockBySize[size] : 0;
        card.dataset[`available_${size.toLowerCase()}`] = qty;
        const span = card.querySelector(`.available-stock-${size.toLowerCase()}`);
        if (span) span.textContent = qty;
    });
});


                    cart = {};
                    renderCart();
                    updateWalletBalance(data.total_amount);
                    showToast('Checkout successful!', 'success');
                } else showToast(data.message, 'error');
            } catch (err) { showToast('Checkout failed! ' + err.message, 'error'); }
        } else showToast('Checkout canceled', 'info');
    });

    // ===== Print Invoice =====
    function printInvoice(cart, total, totalKHR, paymentMethod = 'Cash') {
        const invoiceNumber = `INV-${Date.now()}`;
        const dateTime = new Date().toLocaleString();
        let html = `
            <div class="p-4 text-dark">
                <div class="text-center mb-2">
                    <img src="${window.location.origin}/assets/images/menu-1.jpg" style="width:70px;height:70px;border-radius:50%;object-fit:cover;">
                    <h4 class="mt-2">☕ 9Nine Coffee ☕</h4>
                    <p>Tel: 012 345 678 | ផ្ទះលេខ 25 ផ្លូវព្រះនរោត្តម</p>
                    <hr>
                </div>
                <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
                <p><strong>Date/Time:</strong> ${dateTime}</p>
                <table class="table table-bordered text-center mt-3">
                    <thead class="table-light"><tr><th>Product</th><th>Size</th><th>Sugar</th><th>Qty</th><th>Price</th></tr></thead>
                    <tbody>
                        ${Object.values(cart).map(i => `<tr><td>${i.name}</td><td>${i.size}</td><td>${i.sugar}</td><td>${i.quantity}</td><td>$${(i.unit_price*i.quantity).toFixed(2)}</td></tr>`).join('')}
                        <tr class="fw-bold"><td colspan="4">Total (USD)</td><td>$${total.toFixed(2)}</td></tr>
                        <tr class="fw-bold text-warning"><td colspan="4">Total (KHR)</td><td>៛${totalKHR.toLocaleString()}</td></tr>
                    </tbody>
                </table>
                <div class="text-start mt-3"><strong>Payment Method:</strong> ${paymentMethod}</div>
                <div class="text-center mt-3"><button class="btn btn-primary" onclick="window.print()">Print</button></div>
                <div class="text-center mt-2 border-top pt-2"><small>អរគុណសម្រាប់ការទិញទំនិញ! ☕</small><br><small>Wi-Fi: ninecoffee168</small></div>
            </div>`;
        document.getElementById('receipt-content').innerHTML = html;
        new bootstrap.Modal(document.getElementById('receiptModal')).show();
    }
});
