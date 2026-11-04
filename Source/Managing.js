function hideAllSections() {

  document.getElementById("header-row").classList.add("hidden");
  document.getElementById("order-section").classList.add("hidden");
  document.getElementById("cart-aside").classList.add("hidden");
  document.getElementById("expense-container").classList.add("hidden");
  document.getElementById("ask-container").classList.add("hidden");
  document.getElementById("feedback-popup").classList.add("hidden");
  document.getElementById("delete-feedback").classList.add("hidden");
  
}


// Load đơn yêu cầu đặt
function loadOrders(type) {
  hideAllSections();

  document.getElementById("header-row").classList.remove("hidden");
  document.getElementById("order-section").classList.remove("hidden");

  document.getElementById("page-title").innerText = "Đơn yêu cầu đặt";

  document.getElementById("table-head").innerHTML = `
      <tr>
          <th>Bàn</th>
          <th>Tổng tiền</th>
          <th>Số lượng món</th>
          <th>Trạng thái</th>
      </tr>
  `;

  fetch(`/Managing_Restaurant/PHP/Getoder.php?status=pending`)
      .then(res => res.json())
      .then(data => {
          const body = document.getElementById("order-body");
          body.innerHTML = "";

          let currentDate = "";

          data.forEach(order => {            
             

              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${order.table_number}</td>
                  <td>${order.total_price.toLocaleString()}đ</td>
                  <td>${order.total_quantity}</td>
                  <td>${order.status}</td>
              `;

              tr.onclick = () => loadOrderDetails(order);

              body.appendChild(tr);
          });
      });
}

function loadOrderDetails(order) {
  if (order.status === "Đã thanh toán") {
      document.getElementById("cart-aside").classList.add("hidden");
      return;
  }

  const cart = document.getElementById("cart-aside");
  const cartItems = document.getElementById("cart-items");
  const confirmBtn = document.getElementById("confirm-btn");

  cart.classList.remove("hidden");
cartItems.innerHTML = `<h3>Bàn số ${order.table_number}</h4>`; 

fetch(`/Managing_Restaurant/PHP/GetOderDetail.php?order_id=${order.id}`)
    .then(res => res.json())
    .then(data => {
        data.forEach(item => {
            const total = item.price * item.quantity;
            cartItems.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-left">
                        <img src="${item.product_image}">
                    </div>
                    <div class="cart-item-middle">
                        <div class="item-top-row">
                            <h4>${item.product_name}</h4>
                            <span>${total.toLocaleString()}đ</span>
                        </div>
                        <div class="item-bottom-row">
                            <p>Giá: ${item.price.toLocaleString()}đ</p>
                            <p>Số lượng: ${item.quantity}</p>
                        </div>
                    </div>
                </div>
           `;
        });
    });

  confirmBtn.classList.remove("hidden");
  confirmBtn.innerText = order.status === "Chờ xác nhận đơn hàng" ? "Xác nhận đơn hàng" : "Xác nhận thanh toán";

  confirmBtn.onclick = () =>
      updateOrderStatus(
          order.id,
          order.status === "Chờ xác nhận đơn hàng" ? "Chờ thanh toán" : "Đã thanh toán"
      );
}

// Load đơn đã thanh toán
function loadPaidOrders() {
  hideAllSections();

  document.getElementById("header-row").classList.remove("hidden");
  document.getElementById("order-section").classList.remove("hidden");
  document.getElementById("page-title").innerText = "Đơn đã thanh toán";

  document.getElementById("table-head").innerHTML = `
      <tr>
          <th>Tên món</th>
          <th>Số lượng</th>
          <th>Tổng tiền</th>
          <th>Nhân viên</th>
      </tr>
  `;

  fetch("/Managing_Restaurant/PHP/GetPaidOrders.php")
      .then(res => res.json())
      .then(data => {
          const body = document.getElementById("order-body");
          body.innerHTML = "";

          let current = "";

          data.forEach(r => {
              const dateObj = new Date(r.date);
              const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/` +
                                    `${String(dateObj.getMonth()+1).padStart(2,'0')}` +
                                    `${dateObj.getFullYear()}`;

              if (r.date !== current) {
                  current = r.date;
                  body.innerHTML += `<tr><td colspan="5" style="background:white;font-weight:bold;color:#6b1f1f;">Ngày: ${formattedDate}</td></tr>`;
              }

              body.innerHTML += `
                  <tr>
                      <td>${r.product_name}</td>
                      <td>${r.total_quantity}</td>
                      <td>${r.total_price.toLocaleString()}đ</td>
                      <td>${r.employee_name}</td>
                  </tr>
              `;
          });
      });
}
document.getElementById("close-popup").addEventListener("click", function() {
    document.getElementById("cart-aside").classList.add("hidden");
});


function loadRevenue() {
    hideAllSections();

    document.getElementById("header-row").classList.remove("hidden");
    document.getElementById("order-section").classList.remove("hidden");

    document.getElementById("page-title").innerText = "Tổng thu chi";

    const currentUser = localStorage.getItem("full_name");

    const head = document.getElementById("table-head");
    const body = document.getElementById("order-body");

    let headerHtml = `<tr><th>Ngày</th><th>Tổng thu</th>`;
    if (currentUser === "Quản lý") {
        headerHtml += `<th>Tổng chi</th>`;
        document.getElementById("expense-container").classList.remove("hidden"); 
    } else {
        document.getElementById("expense-container").classList.add("hidden");
    }
    headerHtml += `</tr>`;
    head.innerHTML = headerHtml;

    fetch("/Managing_Restaurant/PHP/GetRevenue.php")
        .then(res => res.json())
        .then(data => {
            body.innerHTML = "";
            let currentMonth = "";

            data.forEach(r => {
                const dateObj = new Date(r.date); 
                const monthYear = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
                const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/` +
                                      `${String(dateObj.getMonth()+1).padStart(2,'0')}/` +
                                      `${dateObj.getFullYear()}`;

                if (monthYear !== currentMonth) {
                    currentMonth = monthYear;
                    body.innerHTML += `
                        <tr>
                            <td colspan="${currentUser === "Quản lý" ? 3 : 2}" style="background:white; font-weight:bold; color:#6b1f1f;">
                                Tháng: ${currentMonth}
                            </td>
                        </tr>
                    `;
                }

                let rowHtml = `<tr><td>${formattedDate}</td><td>${r.total_income.toLocaleString()}đ</td>`;
                if (currentUser === "Quản lý") {
                    rowHtml += `<td>${r.total_expense.toLocaleString()}đ</td>`;
                }
                rowHtml += `</tr>`;
                body.innerHTML += rowHtml;
            });
        });
}


// Cập nhật trạng thái đơn
function updateOrderStatus(id, status){
    const form = new FormData();
    form.append("order_id", id);
    form.append("status", status);

    fetch("/Managing_Restaurant/PHP/UpdateOder.php", {
        method: "POST",
        body: form
    }).then(res => res.json())
      .then(result => {
          if(result.success){
              loadOrders('pending');
          }
      });
}
document.getElementById("live-search").addEventListener("input", function () {
    const keyword = this.value.toLowerCase();
    const rows = document.querySelectorAll("#order-body tr");

    let currentGroupRow = null;
    let groupRows = [];

    const isDateSearch = /\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?/.test(keyword); 

    rows.forEach(row => {
        const isGroupRow = row.querySelector("td[colspan]") !== null;

        if (isGroupRow) {
            if (groupRows.length > 0) {
                let showGroup = false;
                if (isDateSearch) {
                    showGroup = currentGroupRow.innerText.toLowerCase().includes(keyword);
                    groupRows.forEach(r => r.style.display = showGroup ? "" : "none");
                    currentGroupRow.style.display = showGroup ? "" : "none";
                } else {
                    showGroup = groupRows.some(r => r.dataset.match === "true");
                    groupRows.forEach(r => r.style.display = r.dataset.match === "true" ? "" : "none");
                    currentGroupRow.style.display = showGroup ? "" : "none";
                }
            }
            currentGroupRow = row;
            groupRows = [];
        } else {
            const text = row.innerText.toLowerCase();
            const match = text.includes(keyword);
            row.dataset.match = match ? "true" : "false";
            groupRows.push(row);
        }
    });
    if (groupRows.length > 0) {
        let showGroup = false;
        if (isDateSearch) {
            showGroup = currentGroupRow.innerText.toLowerCase().includes(keyword);
            groupRows.forEach(r => r.style.display = showGroup ? "" : "none");
            currentGroupRow.style.display = showGroup ? "" : "none";
        } else {
            showGroup = groupRows.some(r => r.dataset.match === "true");
            groupRows.forEach(r => r.style.display = r.dataset.match === "true" ? "" : "none");
            currentGroupRow.style.display = showGroup ? "" : "none";
        }
    }
});


// Nút thêm thu chi
document.addEventListener("DOMContentLoaded", function() {
  const btn = document.getElementById("expense-btn");

  btn.addEventListener("click", function() {
      const date = document.getElementById("expense-date").value;
      const expense = parseInt(document.getElementById("expense-input").value);
      if(!date){
          alert("Vui lòng chọn ngày.");
          return;
      }
      if(!expense || expense <= 0){
          alert("Vui lòng nhập số tiền chi hợp lệ.");
          return;
      }
      const form = new FormData();
      form.append("date", date);
      form.append("expense", expense);

      fetch("/Managing_Restaurant/PHP/AddExpense.php", {
          method: "POST",
          body: form
      })
      .then(res => res.json())
      .then(result => {
          if(result.success){
              alert("Thêm chi thành công!");
              document.getElementById("expense-input").value = "";
              document.getElementById("expense-date").value = "";
              loadRevenue(); 
          } else {
              alert("Lỗi: " + result.message);
          }
      })
      .catch(err => {
          console.error(err);
          alert("Có lỗi xảy ra khi thêm chi phí.");
      });
  });
});
//Load ca làm nhân viên
function loadEmployee() {
  hideAllSections();

  document.getElementById("header-row").classList.remove("hidden");
  document.getElementById("order-section").classList.remove("hidden");

  document.getElementById("page-title").innerText = "Quản lý nhân viên";

  document.getElementById("table-head").innerHTML = `
      <tr>
          <th>Tên nhân viên</th>
          <th>Ngày</th>
          <th>Ca làm</th>
          <th>Check-in</th>
          <th>Check-out</th>
      </tr>
  `;

  fetch("/Managing_Restaurant/PHP/GetEmployee.php")
      .then(res => res.json())
      .then(data => {
          const body = document.getElementById("order-body");
          body.innerHTML = "";

          let current = "";          

          data.forEach(item => {
              const dateObj = new Date(item.date_work);
              const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/` +
                                    `${String(dateObj.getMonth()+1).padStart(2,'0')}/` +
                                    `${dateObj.getFullYear()}`;

                                  
              if (item.date_work !== current) {
                  current = item.date_work;
                  body.innerHTML += `<tr><td colspan="5" style="background:white;font-weight:bold;color:#6b1f1f;">Ngày: ${formattedDate}</td></tr>`;
              }
              const checkIn = item.check_in ? new Date(item.check_in).toLocaleTimeString() : "-";
              const checkOut = item.check_out ? new Date(item.check_out).toLocaleTimeString() : "-";

              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${item.full_name}</td>
                  <td>${formattedDate}</td>
                  <td>${item.shift_name || "-"}</td>
                  <td>${checkIn}</td>
                  <td>${checkOut}</td>
              `;
              body.appendChild(tr);
          });
      })
      .catch(err => {
          console.error(err);
          alert("Lỗi khi tải danh sách nhân viên.");
      });
}
function loadAsk() {
    hideAllSections();
    document.getElementById("header-row").classList.remove("hidden");
    document.getElementById("order-section").classList.remove("hidden");
    document.getElementById("page-title").innerText = "Đánh giá của khách hàng";
    document.getElementById("delete-feedback").classList.remove("hidden");

    const body = document.getElementById("order-body");
    const head = document.getElementById("table-head");

    head.innerHTML = `
        <tr>
            <th></th>
            <th>Tên khách hàng</th>
            <th>Ngày</th>
            <th>Giờ</th>
        </tr>
    `;
    fetch("/Managing_Restaurant/PHP/GetContact.php")
        .then(res => res.json())
        .then(data => {
            body.innerHTML = "";
  
            let current = "";          

            data.forEach(feedback => {
                const dateObj = new Date(feedback.datetime);
                const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/` +
                                      `${String(dateObj.getMonth()+1).padStart(2,'0')}/` +
                                      `${dateObj.getFullYear()}`;
                const formattedTime = dateObj.toLocaleTimeString();
            
                const groupKey = dateObj.toISOString().split("T")[0]; 

                if (groupKey !== current) {
                    current = groupKey;
            
                    const groupRow = document.createElement("tr");
                    groupRow.innerHTML = `
                        <td colspan="5" style="background:white;font-weight:bold;color:#6b1f1f;">
                            Ngày: ${formattedDate}
                        </td>
                    `;
                    body.appendChild(groupRow);
                }
            

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <span class="stars">
                            ${[1,2,3,4,5].map(i => i <= feedback.rating 
                                ? '★' 
                                : '☆').join('')}
                        </span>
                    </td>
                    <td>${feedback.name}</td>
                    <td>${formattedDate}</td>
                    <td>${formattedTime}</td>
                    
                `;
                tr.onclick = () => {
                    const popup = document.getElementById("feedback-popup");
                    const items = document.getElementById("feedback-items");
                    const title = document.getElementById("feedback-title");
                
                    title.innerText = `Đánh giá của ${feedback.name}`;
                
                    items.innerHTML = "";
                
                    let starsHtml = [1,2,3,4,5].map(i => 
                        `<span style="color:${i <= feedback.rating ? '#6b1f1f' : '#ccc'}">★</span>`
                    ).join('');
                
                    let empListHtml = feedback.employee_list
                        .map(emp => `<div>${emp}</div>`)
                        .join("");
                
                    items.innerHTML = `
                        <p><strong>Email:</strong> ${feedback.email || '-'}</p>
                        <p><strong>Điện thoại:</strong> ${feedback.phone || '-'}</p>
                        <p><strong>Nội dung:</strong> ${feedback.message}</p>
                        <p><strong>Sao:</strong> ${starsHtml}</p>
                        <br>
                        <h3><strong>Nhân viên phục vụ</strong></h3>
                        <p class="employ">${empListHtml}</p>
                        <br><br>
                        <button id="delete-feedback-btn" class="btn-red">Xoá đánh giá</button>
                    `;
                
                    popup.classList.remove("hidden");
                
                    document.getElementById("delete-feedback-btn").onclick = () => {
                        if(confirm("Bạn có chắc muốn xoá đánh giá này?")){
                            const form = new FormData();
                            form.append("id", feedback.id);
                
                            fetch("/Managing_Restaurant/PHP/DeleteFeedback.php", {
                                method: "POST",
                                body: form
                            })
                            .then(res => res.json())
                            .then(result => {
                                if(result.success){
                                    alert("Xoá thành công!");
                                    popup.classList.add("hidden");
                                    loadAsk();
                                }
                            });
                        }
                    };
                }; 
                body.appendChild(tr);
            });            
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi khi tải đánh giá khách hàng.");
        });
    // Đóng popup
    document.getElementById("close-feedback-popup").addEventListener("click", () => {
        document.getElementById("feedback-popup").classList.add("hidden");
    });
}

document.getElementById("deletefeedback-btn").onclick = () => {
    const fromDate = document.getElementById("from-date").value;
    const toDate = document.getElementById("to-date").value;

    if(!fromDate || !toDate){
        alert("Vui lòng chọn cả từ ngày và đến ngày");
        return;
    }

    if(confirm(`Bạn có chắc muốn xoá tất cả feedback từ ${fromDate} đến ${toDate}?`)){
        const form = new FormData();
        form.append("from_date", fromDate);
        form.append("to_date", toDate);

        fetch("/Managing_Restaurant/PHP/DeleteFeedback.php", {
            method: "POST",
            body: form
        })
        .then(res => res.json())
        .then(result => {
            if(result.success){
                loadAsk(); 
            } else {
                alert("Lỗi: " + result.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Có lỗi xảy ra khi xoá feedback.");
        });
    }
};
const buttons = document.querySelectorAll(".sidebar .menu-btn, .sidebar .logout");
buttons.forEach(btn => {
  btn.addEventListener("click", function () {

    buttons.forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

const sidebar = document.querySelector(".sidebar");
const toggleBtn = document.getElementById("menu-toggle");
toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

document.querySelector(".logout").addEventListener("click", function() {
    if(confirm("Bạn có chắc muốn đăng xuất?")) {
        fetch("/Managing_Restaurant/PHP/Logout.php", { 
            method: "GET",
            credentials: "same-origin"
        })
        .then(res => res.json())
        .then(data => {
            if(data.success){
                window.location.href = "/Managing_Restaurant/HTML/User/Login.html"; 
            } else {
                alert("Lỗi: " + (data.message || "Không thể đăng xuất"));
            }
        })
        .catch(err => {
            console.error(err);
            alert("Có lỗi xảy ra khi đăng xuất.");
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = localStorage.getItem("full_name");
    
    const askBtn = document.querySelector("button[onclick='loadAsk()']");
    
    if (currentUser !== "Quản lý") {
        askBtn.style.display = "none";
    } else {
        askBtn.style.display = "block";
    }
});
