document.addEventListener("DOMContentLoaded", () => {
  const cartItems = document.getElementById("cart-items");
  const totalPriceEl = document.getElementById("total-price");
  const totalQuantityEl = document.getElementById("total-quantity");
  const tableDiv = document.querySelector(".table-number");
  const popup = document.getElementById("confirm-popup");
  const orderBtn = document.getElementById("order-btn");
  const closeBtn = document.getElementById("close-popup");
  const addMoreBtn = document.getElementById("add-more-btn");
  const payBtn = document.getElementById("pay-btn");
  const paymentPopup = document.getElementById("payment-method-popup");
  const cashBtn = document.getElementById("cash-btn");
  const bankBtn = document.getElementById("bank-btn");

  const tableNumber = localStorage.getItem("table_number") || "0";
  tableDiv.textContent = tableNumber;

  async function loadCart() {
    try {
      const [cartRes, orderRes] = await Promise.all([
        fetch(`/Managing_Restaurant/PHP/Getcart.php?table=${tableNumber}`),
        fetch(`/Managing_Restaurant/PHP/CheckOder.php?table=${tableNumber}`)
      ]);
  
      const cartData = await cartRes.json();
      const orderData = await orderRes.json();
  
      cartItems.innerHTML = "";
      let total = 0;
      let totalQty = 0;
  
      // danh sách món trong giỏ hàng
      cartData.forEach(item => {
        const price = parseInt(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const itemTotal = price * quantity;
        total += itemTotal;
        totalQty += quantity;
  
        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.dataset.id = item.id;
  
        div.innerHTML = `
          <div class="cart-item-left">
            <img src="${item.product_image}" alt="${item.product_name}">
          </div>
          <div class="cart-item-middle">
            <div class="item-top-row">
              <h4>${item.product_name}</h4>
              <span class="item-total">${itemTotal.toLocaleString()}đ</span>
            </div>
            <div class="item-bottom-row">
              <p class="item-price">Giá: ${price.toLocaleString()}đ</p>
              <div class="quantity-control">
                <button class="decrease">−</button>
                <span class="quantity">${quantity}</span>
                <button class="increase">+</button>
              </div>
            </div>
            <button class="remove-btn">✖️</button>
          </div>
        `;
        cartItems.appendChild(div);
      });
  
      //  Món trong chờ thanh toán
      orderData.forEach(item => {
        const price = parseInt(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const itemTotal = price * quantity;
        total += itemTotal;
        totalQty += quantity;
  
        const div = document.createElement("div");
        div.classList.add("cart-item", "locked");
  
        div.innerHTML = `
          <div class="cart-item-left">
            <img src="${item.product_image}" alt="${item.product_name}">
          </div>
          <div class="cart-item-middle">
            <div class="item-top-row">
              <h4>${item.product_name}</h4>
              <span class="item-total">${itemTotal.toLocaleString()}đ</span>
            </div>
            <div class="item-bottom-row">
              <p class="item-price">Giá: ${price.toLocaleString()}đ</p>
              <p class="item-qty">Số lượng: ${quantity}</p>
            </div>
          </div>
        `;
        cartItems.appendChild(div);
      });
  
      totalPriceEl.textContent = total.toLocaleString() + "đ";
      totalQuantityEl.textContent = totalQty;
  
      // Tự động hiện popup nếu cart trống nhưng có đơn hàng
      if (cartData.length === 0 && orderData.length > 0) {
        popup.classList.remove("hidden");
      }
  
    } catch (err) {
      console.error("Lỗi loadCart:", err);
    }
  }
  
  loadCart();

  cartItems.addEventListener("click", e => {
    const itemDiv = e.target.closest(".cart-item");
    if (!itemDiv || itemDiv.classList.contains("locked")) return; //  Không chỉnh món 

    const id = itemDiv.dataset.id;
    if (e.target.classList.contains("remove-btn")) {
      fetch(`/Managing_Restaurant/PHP/Deletecart.php?id=${id}&table=${tableNumber}`).then(loadCart);
    } else if (e.target.classList.contains("increase")) {
      fetch(`/Managing_Restaurant/PHP/Addcart.php?id=${id}&action=increase&table=${tableNumber}`).then(loadCart);
    } else if (e.target.classList.contains("decrease")) {
      fetch(`/Managing_Restaurant/PHP/Addcart.php?id=${id}&action=decrease&table=${tableNumber}`).then(loadCart);
    }
  }); 

  //  Popup đặt/thanh toán
  orderBtn.addEventListener("click", () => popup.classList.remove("hidden"));
  orderBtn.addEventListener("click", async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("table_number", tableNumber);
      formData.append("action", "addmore");
  
      const res = await fetch("/Managing_Restaurant/PHP/Oder.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });
      const data = await res.json();
  
      if (data.status === "success") {
        popup.classList.remove("hidden");
        loadCart();
      } else {
        alert("" + data.message);
      }
    } catch (err) {
      console.error("Lỗi khi đặt món:", err);
    }
  });
  

  closeBtn.addEventListener("click", () => popup.classList.add("hidden"));

  addMoreBtn.addEventListener("click", () => {
    window.location.href = "Food.html";
  });
  
  payBtn.addEventListener("click", async () => {
    try {
      const checkRes = await fetch(`/Managing_Restaurant/PHP/CheckOder.php?table=${tableNumber}`);
      const orders = await checkRes.json();
  
      if (orders.length === 0) {
        return;
      }
        popup.classList.add("hidden");
        document.getElementById("payment-method-popup").classList.remove("hidden");
  
    } catch (err) {
      console.error("Lỗi khi thanh toán:", err);
    }
  });
  
  cashBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/Managing_Restaurant/PHP/Oder.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `table_number=${tableNumber}&action=pay&method=cash`
      });
  
      const data = await res.json();
      if (data.status === "success") {
        paymentPopup.classList.add("hidden");
        loadCart();
      }
    } catch (err) {
      console.error(err);
    }
  });
  
  bankBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/Managing_Restaurant/PHP/Oder.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `table_number=${tableNumber}&action=pay&method=bank`
      });
  
      const data = await res.json();
      if (data.status === "success") {
        paymentPopup.classList.add("hidden");
        window.location.href = "thanhtoan.html"; 
      }
    } catch (err) {
      console.error(err);
    }
  });
  
  
});
