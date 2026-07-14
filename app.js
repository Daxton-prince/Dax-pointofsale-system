// ============================================================
//  DAX - Complete All-in-One System
// ============================================================

// ---------- GLOBALS ----------
const ADMIN_PASSWORD = '0104';
let cart = [];
let currentCategory = 'All';
let selectedPayment = 'Cash';
let dashTrendChart = null;
let dashTopChart = null;

// ---------- LOCAL STORAGE HELPERS ----------
function getProducts() { return JSON.parse(localStorage.getItem('products')) || []; }
function saveProducts(products) { localStorage.setItem('products', JSON.stringify(products)); }
function getSales() { return JSON.parse(localStorage.getItem('salesHistory')) || []; }
function saveSales(sales) { localStorage.setItem('salesHistory', JSON.stringify(sales)); }
function getCustomers() { return JSON.parse(localStorage.getItem('customers')) || []; }
function saveCustomers(customers) { localStorage.setItem('customers', JSON.stringify(customers)); }

// ---------- NAVIGATION ----------
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.sidebar-nav a[data-page="${page}"]`)?.classList.add('active');
    
    const titles = {
        'dashboard': 'Dashboard <small>overview</small>',
        'pos': 'Point of Sale <small>new sale</small>',
        'products': 'Products <small>inventory</small>',
        'customers': 'Customers <small>directory</small>',
        'invoices': 'Invoices <small>history</small>'
    };
    document.getElementById('pageTitle').innerHTML = titles[page] || page;
    document.getElementById('sidebar').classList.remove('open');
    
    if (page === 'dashboard') refreshDashboard();
    if (page === 'pos') renderProducts();
    if (page === 'products') loadStock();
    if (page === 'customers') loadCustomers();
    if (page === 'invoices') loadInvoices();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !e.target.closest('.mobile-toggle')) {
            sidebar.classList.remove('open');
        }
    }
});

// ---------- DATE DISPLAY ----------
document.getElementById('currentDate').innerHTML = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

// ---------- NOTIFICATION ----------
function notify(msg, title = 'Alert') {
    document.getElementById('notifyTitle').innerText = title;
    document.getElementById('notifyMessage').innerText = msg;
    document.getElementById('notifyModal').classList.add('show');
}
function closeNotify() { document.getElementById('notifyModal').classList.remove('show'); }

// ---------- ADMIN ----------
function openAdmin() { document.getElementById('adminModal').classList.add('show'); }
function closeAdmin() { document.getElementById('adminModal').classList.remove('show'); }
function checkAdmin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === ADMIN_PASSWORD) {
        closeAdmin();
        document.getElementById('adminPass').value = '';
        notify('Access granted', 'Success');
    } else {
        document.getElementById('loginError').innerText = 'Wrong password!';
    }
}

// ---------- SEED DATA ----------
function seedData() {
    if (!localStorage.getItem('products')) {
        const products = [
            { code: 'CAD-DM-090', name: 'Cadbury Dairy Milk 90g', category: 'Confectionery', price: 195, stock: 50, vat: '1%' },
            { code: 'IND-NC-070', name: 'Indomie Noodles Chicken 70g', category: 'Groceries', price: 35, stock: 100, vat: '16%' },
            { code: 'DET-AS-125', name: 'Dettol Antibacterial Soap', category: 'Personal Care', price: 165, stock: 30, vat: '16%' },
            { code: 'SAF-AIR-100', name: 'Safaricom Airtime KES 100', category: 'Beverages', price: 100, stock: 200, vat: '16%' },
            { code: 'OMO-WP-1KG', name: 'Omo Washing Powder 1kg', category: 'Household', price: 420, stock: 25, vat: '16%' },
            { code: 'ARI-LD-1LT', name: 'Ariel Liquid Detergent 1L', category: 'Household', price: 510, stock: 20, vat: '16%' },
            { code: 'TUS-ML-500', name: 'Tusker Malt Lager 500ml', category: 'Beverages', price: 250, stock: 60, vat: '16%' },
            { code: 'KET-TB-050', name: 'Ketepa Pride Tea Bags 50s', category: 'Groceries', price: 195, stock: 40, vat: '16%' },
            { code: 'MIL-1L-F', name: 'Fresh Milk 1L', category: 'Dairy', price: 120, stock: 80, vat: '16%' },
            { code: 'YOG-500', name: 'Yogurt 500ml', category: 'Dairy', price: 90, stock: 45, vat: '16%' }
        ];
        localStorage.setItem('products', JSON.stringify(products));
    }
    if (!localStorage.getItem('salesHistory')) {
        const now = Date.now();
        const sales = [];
        const customers = ['John Mwangi', 'Jane Akinyi', 'Alice Wanjiru', 'Bob Ochieng', 'Carol Kemunto'];
        for (let i = 0; i < 20; i++) {
            const ts = now - (Math.floor(Math.random() * 168) * 60 * 60 * 1000);
            sales.push({
                id: ts,
                timestamp: ts,
                date: new Date(ts).toLocaleDateString(),
                time: new Date(ts).toLocaleTimeString(),
                customer: customers[Math.floor(Math.random() * customers.length)],
                items: [{ name: 'Product', qty: Math.floor(Math.random() * 3) + 1, price: Math.floor(Math.random() * 200) + 50 }],
                total: Math.floor(Math.random() * 500) + 100,
                discount: 0,
                paid: 0
            });
        }
        localStorage.setItem('salesHistory', JSON.stringify(sales));
    }
}

// ============================================================
//  DASHBOARD
// ============================================================
function refreshDashboard() {
    const sales = getSales();
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => {
        const d = new Date(s.timestamp || s.id || Date.now());
        return d.toDateString() === today;
    });
    
    let total = 0, items = 0, customers = new Set();
    todaySales.forEach(s => {
        total += Number(s.total) || 0;
        if (s.items) s.items.forEach(i => { items += Number(i.qty) || 0; });
        if (s.customer) customers.add(s.customer);
    });
    
    document.getElementById('dashTodaySales').innerText = `KES ${total.toFixed(2)}`;
    document.getElementById('dashCustomers').innerText = customers.size || 0;
    document.getElementById('dashItems').innerText = items;
    document.getElementById('dashInvoices').innerText = sales.length;
    
    // Recent transactions
    const recent = document.getElementById('recentTransactions');
    const recentSales = todaySales.slice(-5).reverse();
    if (recentSales.length === 0) {
        recent.innerHTML = '<div class="item"><span class="text-muted" style="color:#6a8aaa;">No transactions yet today</span></div>';
    } else {
        recent.innerHTML = recentSales.map(s => `
            <div class="item">
                <div class="info"><div class="name">${s.customer || 'Guest'}</div>
                <div class="meta">${s.items ? s.items.length : 0} items · ${new Date(s.timestamp || s.id).toLocaleTimeString()}</div></div>
                <div class="amount">KES ${(Number(s.total) || 0).toFixed(2)}</div>
            </div>
        `).join('');
    }
    
    // Best sellers
    const best = document.getElementById('bestSellers');
    const productCount = {};
    sales.forEach(s => {
        if (s.items) s.items.forEach(i => {
            const name = i.name || 'Unknown';
            productCount[name] = (productCount[name] || 0) + (Number(i.qty) || 0);
        });
    });
    const sorted = Object.entries(productCount).sort((a,b) => b[1] - a[1]).slice(0,5);
    if (sorted.length === 0) {
        best.innerHTML = '<div class="item"><span class="text-muted" style="color:#6a8aaa;">No sales data yet</span></div>';
    } else {
        best.innerHTML = sorted.map(([name, qty]) => `
            <div class="item"><span>${name}</span> <span class="text-muted" style="color:#6a8aaa;">${qty} units</span></div>
        `).join('');
    }
    
    renderDashCharts(sales);
}

function renderDashCharts(sales) {
    const ctx1 = document.getElementById('dashTrendChart').getContext('2d');
    const ctx2 = document.getElementById('dashTopChart').getContext('2d');
    
    const sevenDays = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        sevenDays.push(d.toDateString());
    }
    const dailySales = sevenDays.map(date => {
        const daySales = sales.filter(s => {
            const d = new Date(s.timestamp || s.id || Date.now());
            return d.toDateString() === date;
        });
        return daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    });
    
    if (dashTrendChart) dashTrendChart.destroy();
    dashTrendChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: sevenDays.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' })),
            datasets: [{ label: 'Daily Sales (KES)', data: dailySales, borderColor: '#1a5bbf', fill: true, backgroundColor: 'rgba(26,91,191,0.1)', tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    
    const productCount = {};
    sales.forEach(s => {
        if (s.items) s.items.forEach(i => {
            const name = i.name || 'Unknown';
            productCount[name] = (productCount[name] || 0) + (Number(i.qty) || 0);
        });
    });
    const top = Object.entries(productCount).sort((a,b) => b[1] - a[1]).slice(0,5);
    
    if (dashTopChart) dashTopChart.destroy();
    dashTopChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: top.map(t => t[0].length > 10 ? t[0].substring(0,10)+'...' : t[0]),
            datasets: [{ label: 'Units Sold', data: top.map(t => t[1]), backgroundColor: ['#1a5bbf','#3b82f6','#16a34a','#f59e0b','#8b5cf6'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ============================================================
//  POS - PRODUCTS & CART
// ============================================================
function renderProducts(category = 'All') {
    const products = getProducts();
    const filtered = category === 'All' ? products : products.filter(p => p.category === category);
    const grid = document.getElementById('productGrid');
    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="addToCart('${p.code}')">
            <div class="product-image"><i class="fa fa-box"></i></div>
            <div class="product-name">${p.name}</div>
            <div class="product-code">${p.code}</div>
            <div class="product-price">KES ${p.price}</div>
            <div class="product-vat">VAT ${p.vat || '16%'}</div>
            <div class="product-stock">${p.stock}</div>
        </div>
    `).join('');
}

function filterProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const products = getProducts();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.code.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
    const grid = document.getElementById('productGrid');
    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="addToCart('${p.code}')">
            <div class="product-image"><i class="fa fa-box"></i></div>
            <div class="product-name">${p.name}</div>
            <div class="product-code">${p.code}</div>
            <div class="product-price">KES ${p.price}</div>
            <div class="product-vat">VAT ${p.vat || '16%'}</div>
            <div class="product-stock">${p.stock}</div>
        </div>
    `).join('');
}

function filterByCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.category-tab:contains(${category})`)?.classList.add('active');
    if (category === 'All') {
        renderProducts('All');
    } else {
        const products = getProducts().filter(p => p.category === category);
        const grid = document.getElementById('productGrid');
        grid.innerHTML = products.map(p => `
            <div class="product-card" onclick="addToCart('${p.code}')">
                <div class="product-image"><i class="fa fa-box"></i></div>
                <div class="product-name">${p.name}</div>
                <div class="product-code">${p.code}</div>
                <div class="product-price">KES ${p.price}</div>
                <div class="product-vat">VAT ${p.vat || '16%'}</div>
                <div class="product-stock">${p.stock}</div>
            </div>
        `).join('');
    }
}

// ---------- CART ----------
function addToCart(productCode) {
    const products = getProducts();
    const product = products.find(p => p.code === productCode);
    if (!product) return;
    if (product.stock <= 0) { notify('Product out of stock!', 'Warning'); return; }
    
    const existing = cart.find(item => item.code === productCode);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCart();
}

function updateCart() {
    const container = document.getElementById('cartItems');
    const empty = container.querySelector('.empty-cart');
    if (empty) empty.remove();
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fa fa-shopping-cart"></i>
                <p>Cart is empty</p>
                <small>Click a product to add it</small>
            </div>
        `;
    } else {
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-code">${item.code}</div>
                    <span class="item-vat">VAT ${item.vat || '16%'}</span>
                </div>
                <div class="item-qty">
                    <button onclick="updateQty(${index}, -1)">−</button>
                    <span>${item.qty}</span>
                    <button onclick="updateQty(${index}, 1)">+</button>
                </div>
                <div class="item-price">KES ${(item.price * item.qty).toFixed(2)}</div>
                <button class="item-remove" onclick="removeFromCart(${index})"><i class="fa fa-times"></i></button>
            </div>
        `).join('');
    }
    
    // Update totals
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('cartTotal').innerText = `KES ${total.toFixed(2)}`;
    document.getElementById('saleAmount').innerText = `KES ${total.toFixed(2)}`;
    document.getElementById('cartCount').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty < 1) cart[index].qty = 1;
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function changeCustomer() {
    const name = prompt('Enter customer name:', '');
    if (name) {
        document.getElementById('customerName').innerText = name;
        let customers = getCustomers();
        if (!customers.find(c => c.name === name)) {
            customers.push({ name, sales: 0 });
            saveCustomers(customers);
        }
    }
}

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-btn').forEach(b => b.style.borderColor = '#dce4ee');
    document.querySelector(`.payment-btn.${method.toLowerCase()}`).style.borderColor = '#1a5bbf';
}

// ---------- COMPLETE SALE ----------
function completeSale() {
    if (cart.length === 0) { notify('Cart is empty!', 'Warning'); return; }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const customer = document.getElementById('customerName').innerText;
    
    // Deduct stock
    let products = getProducts();
    let errors = [];
    cart.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (!product) { errors.push(`${item.name} not found`); return; }
        if (product.stock < item.qty) errors.push(`Not enough stock for ${item.name}`);
        else product.stock -= item.qty;
    });
    if (errors.length) { notify(errors.join(' | '), 'Stock Error'); return; }
    saveProducts(products);
    
    // Save sale
    const sale = {
        id: Date.now(),
        timestamp: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        customer: customer,
        items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
        total: total,
        discount: 0,
        paid: total,
        payment: selectedPayment
    };
    let sales = getSales();
    sales.push(sale);
    saveSales(sales);
    
    // Update customer
    let customers = getCustomers();
    const cust = customers.find(c => c.name === customer);
    if (cust) { cust.sales = (cust.sales || 0) + total; saveCustomers(customers); }
    
    // Print receipt
    const win = window.open('', '_blank', 'width=320,height=500');
    win.document.write(`
        <html><head><title>Receipt</title>
        <style>body{font-family:monospace;padding:16px;text-align:center;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{padding:4px;border-bottom:1px solid #ddd;text-align:left;}
        .total{font-size:18px;font-weight:bold;margin:12px 0;}
        </style></head>
        <body>
        <h2>Dax supermarket</h2>
        <p>${customer}</p>
        <p>${sale.date} ${sale.time}</p>
        <hr>
        <table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>
        ${cart.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${(item.price * item.qty).toFixed(2)}</td></tr>`).join('')}
        </table>
        <hr>
        <div class="total">Total: KES ${total.toFixed(2)}</div>
        <p>Payment: ${selectedPayment}</p>
        <p style="margin-top:20px;">Thank You for shopping with us!</p>
        <script>
            setTimeout(() => { window.print(); }, 500);
        <\/script>
        </body></html>
    `);
    win.document.close();
    
    cart = [];
    updateCart();
    renderProducts(currentCategory);
    notify('Sale completed!', 'Success');
    refreshDashboard();
}

// ============================================================
//  PRODUCTS PAGE
// ============================================================
function loadStock() {
    const products = getProducts();
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';
    let totalVal = 0, low = 0, out = 0;
    products.forEach((p, i) => {
        const stock = Number(p.stock) || 0;
        const price = Number(p.price) || 0;
        totalVal += stock * price;
        if (stock <= 0) out++;
        else if (stock < 5) low++;
        const status = stock <= 0 ? 'out' : (stock < 5 ? 'low' : 'normal');
        tbody.innerHTML += `
            <tr>
                <td style="padding:8px 12px;">${i+1}</td>
                <td>${p.code}</td>
                <td>${p.name}</td>
                <td>${p.category || '-'}</td>
                <td>KES ${price.toFixed(2)}</td>
                <td>${stock}</td>
                <td><span class="status-badge ${status}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn-sm primary" onclick="editProduct('${p.code}')"><i class="fa fa-edit"></i></button>
                    <button class="btn-sm danger" onclick="deleteProduct('${p.code}')"><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById('stockTotal').innerText = products.length;
    document.getElementById('stockLow').innerText = low;
    document.getElementById('stockOut').innerText = out;
    document.getElementById('stockValue').innerText = `KES ${totalVal.toFixed(2)}`;
}

function filterStock() {
    const q = document.getElementById('stockSearch').value.toLowerCase();
    document.querySelectorAll('#stockTableBody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

function openAddProduct() {
    document.getElementById('editCode').value = '';
    document.getElementById('pCode').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pStock').value = '';
    document.getElementById('productModalTitle').innerText = 'Add Product';
    document.getElementById('productModal').classList.add('show');
}

function closeProduct() { document.getElementById('productModal').classList.remove('show'); }

function saveProduct() {
    const code = document.getElementById('pCode').value.trim();
    const name = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value;
    const price = parseFloat(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value) || 0;
    const editCode = document.getElementById('editCode').value;
    if (!code || !name || isNaN(price)) { notify('Fill all fields', 'Warning'); return; }
    let products = getProducts();
    if (editCode) products = products.filter(p => p.code !== editCode);
    else if (products.find(p => p.code === code)) { notify('Code exists', 'Warning'); return; }
    products.push({ code, name, category, price, stock, vat: '16%' });
    saveProducts(products);
    closeProduct();
    loadStock();
    renderProducts(currentCategory);
    notify('Product saved', 'Success');
}

function editProduct(code) {
    const products = getProducts();
    const p = products.find(x => x.code === code);
    if (!p) return;
    document.getElementById('editCode').value = code;
    document.getElementById('pCode').value = p.code;
    document.getElementById('pName').value = p.name;
    document.getElementById('pCategory').value = p.category || 'Groceries';
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('productModalTitle').innerText = 'Edit Product';
    document.getElementById('productModal').classList.add('show');
}

function deleteProduct(code) {
    if (confirm('Delete this product?')) {
        let products = getProducts().filter(p => p.code !== code);
        saveProducts(products);
        loadStock();
        renderProducts(currentCategory);
        notify('Product deleted', 'Deleted');
    }
}

// ============================================================
//  CUSTOMERS PAGE
// ============================================================
function loadCustomers() {
    const customers = getCustomers();
    const sales = getSales();
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#6a8aaa;">No customers yet</td></tr>';
        return;
    }
    const today = new Date().toDateString();
    let todayCount = 0;
    customers.forEach((c, i) => {
        const cSales = sales.filter(s => s.customer === c.name);
        const lastSale = cSales.length > 0 ? cSales[cSales.length - 1] : null;
        if (cSales.some(s => new Date(s.timestamp || s.id).toDateString() === today)) todayCount++;
        tbody.innerHTML += `
            <tr>
                <td style="padding:8px 12px;">${i+1}</td>
                <td>${c.name}</td>
                <td>KES ${(c.sales || 0).toFixed(2)}</td>
                <td>${lastSale ? new Date(lastSale.timestamp || lastSale.id).toLocaleDateString() : 'Never'}</td>
            </tr>
        `;
    });
    document.getElementById('totalCustomers').innerText = customers.length;
    document.getElementById('todayCustomers').innerText = todayCount;
}

// ============================================================
//  INVOICES PAGE
// ============================================================
function loadInvoices() {
    const sales = getSales();
    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = '';
    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6a8aaa;">No invoices yet</td></tr>';
        return;
    }
    sales.slice(-20).reverse().forEach((s, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="padding:8px 12px;">${i+1}</td>
                <td>#INV-${String(s.id || Date.now()).slice(-6)}</td>
                <td>${s.customer || 'Guest'}</td>
                <td>${s.date || ''}</td>
                <td>KES ${(Number(s.total) || 0).toFixed(2)}</td>
                <td><span class="status-badge normal">PAID</span></td>
            </tr>
        `;
    });
}

// ---------- GLOBAL SEARCH ----------
function globalSearch() {
    const q = document.getElementById('globalSearch').value.toLowerCase();
    if (q.length > 2) {
        const products = getProducts();
        const found = products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        if (found.length > 0) {
            navigateTo('pos');
            document.getElementById('productSearch').value = q;
            filterProducts();
        }
    }
}

// ============================================================
//  INITIALIZATION
// ============================================================
window.onload = function() {
    seedData();
    refreshDashboard();
    renderProducts();
    loadStock();
    loadCustomers();
    loadInvoices();
    document.getElementById('productSearch').value = '';
    console.log('🚀 DaxPOS loaded successfully!');
};
