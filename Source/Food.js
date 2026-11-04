  const foodButtons = document.getElementById("foodButtons");
  const btns = document.querySelectorAll(".food-btn");
  const fieldsets = document.querySelectorAll("fieldset");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      foodButtons.classList.add("sticky");
    } else {
      foodButtons.classList.remove("sticky");
    }
  });

  // Khi click nút => hiển thị đúng fieldset
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Xóa active ở các nút khác
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Ẩn toàn bộ fieldset
      fieldsets.forEach((fs) => fs.classList.remove("active"));

      // Hiện fieldset được chọn
      const targetId = btn.dataset.target;
      document.getElementById(targetId).classList.add("active");

      document.getElementById(targetId).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.getElementById("lau").classList.add("active");
  document.querySelector('.food-btn[data-target="lau"]').classList.add("active");


  window.addEventListener("scroll", () => {
      const topBar = document.querySelector(".top-bar");
      const menuBar = document.querySelector(".menu-bar");
      const foodButtons = document.getElementById("foodButtons");
    
      const scrollY = window.scrollY;
    
      if (scrollY > 120) {
        topBar.style.display = "none";
        menuBar.classList.add("sticky");
      } else {
        topBar.style.display = "flex";
        menuBar.classList.remove("sticky");
      }
    
      if (scrollY > 250) {
        foodButtons.classList.add("sticky");
      } else {
        foodButtons.classList.remove("sticky");
      }
    });
    //Điều chỉnh số lượng mua hàng
    document.querySelectorAll('.food-item').forEach(item => {
      const minusBtn = item.querySelector('.minus');
      const plusBtn = item.querySelector('.plus');
      const quantitySpan = item.querySelector('.quantity');
      let quantity = 1;
    
      if (minusBtn && plusBtn && quantitySpan) {
        minusBtn.addEventListener('click', () => {
          if (quantity > 1) {
            quantity--;
            quantitySpan.textContent = quantity;
          }
        });
    
        plusBtn.addEventListener('click', () => {
          quantity++;
          quantitySpan.textContent = quantity;
        });
      }
    });// ====== TĂNG GIẢM SỐ LƯỢNG ======
    document.querySelectorAll(".plus").forEach(btn => {
      btn.addEventListener("click", () => {
        const quantitySpan = btn.parentElement.querySelector(".quantity");
        let quantity = parseInt(quantitySpan.textContent);
        quantity++;
        quantitySpan.textContent = quantity;
      });
    });
    
    document.querySelectorAll(".minus").forEach(btn => {
      btn.addEventListener("click", () => {
        const quantitySpan = btn.parentElement.querySelector(".quantity");
        let quantity = parseInt(quantitySpan.textContent);
        if (quantity > 1) quantity--;
        quantitySpan.textContent = quantity;
      });
    });
    
document.querySelectorAll(".add-cart").forEach(btn => {
  btn.addEventListener("click", () => {
    const foodItem = btn.closest(".food-item");
    const name = foodItem.querySelector("h4").textContent.trim();
    const img = foodItem.querySelector("img").getAttribute("src");
    const priceText = foodItem.querySelector("p").textContent.trim();
    const price = parseInt(priceText.replace(/\D/g, "")); // Lấy số từ "155.000đ"
    const quantity = parseInt(foodItem.querySelector(".quantity").textContent);

    const table_number = localStorage.getItem("table_number") || 0;
    console.log({ name, img, price, quantity, table_number });

    fetch("/Managing_Restaurant/Php/Addcart.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, img, price, quantity, table_number })
    })
    .then(res => res.text())  
    .then(text => {
      console.log("Response raw:", text);
      try {
        return JSON.parse(text);
      } catch(e) {
        throw new Error("Invalid JSON response: " + text);
      }
    })
    
        .then(data => {
      if (data.status === "success") {
        alert(` Đã thêm ${quantity} ${name} vào giỏ hàng!`);
      } else {
        alert(" Thêm vào giỏ thất bại: " + data.message);
      }
    })
    .catch(err => {
      console.error("Lỗi fetch:", err);
      alert("⚠️ Không thể kết nối đến server!");
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Lấy số bàn từ URL (ví dụ: ?table=3)
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromURL = urlParams.get("table");

  // Nếu có bàn trong URL thì lưu cố định vào localStorage
  if (tableFromURL) {
    localStorage.setItem("table_number", tableFromURL);
    console.log("Đã lưu bàn:", tableFromURL);
  }

  // Xóa tham số ?table=... khỏi URL (để khách không tự đổi)
  if (window.location.search.includes("table=")) {
    const cleanURL = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
  }
});