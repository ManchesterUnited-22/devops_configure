document.addEventListener("DOMContentLoaded", async () => {
    const orderItemsDiv = document.getElementById("order-items");
    const totalPriceEl = document.getElementById("total-price");
    const momoBtn = document.getElementById("momo");
    const bankBtn = document.getElementById("bank");
    const continueBtn = document.getElementById("continueBtn");
    const bankSelect = document.getElementById("bankSelect");
    const momoQRCodeDiv = document.getElementById("momoQRCode");

    const tableNumber = localStorage.getItem("table_number") || "1";
    // Load đơn hàng
    async function loadOrders() {
        try {
            const res = await fetch(`/Managing_Restaurant/PHP/CheckOder.php?table=${tableNumber}`);
            const orders = await res.json();
            orderItemsDiv.innerHTML = "";
            let total = 0;
            orders.forEach(item => {
                const price = parseInt(item.price) || 0;
                const quantity = parseInt(item.quantity) || 0;
                const itemTotal = price * quantity;
                total += itemTotal;

                const div = document.createElement("div");
                div.classList.add("order-item");
                div.innerHTML = `<span>${item.product_name} x${quantity}</span><span>${itemTotal.toLocaleString()}đ</span>`;
                orderItemsDiv.appendChild(div);
            });
            totalPriceEl.textContent = total.toLocaleString() + "đ";
        } catch (err) {
            console.error(err);
            orderItemsDiv.innerHTML = "<p>Không thể tải đơn hàng.</p>";
        }
    }
    loadOrders();

    // Chọn phương thức
    [momoBtn, bankBtn].forEach(btn => btn.addEventListener("click", () => {
        [momoBtn, bankBtn].forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        bankSelect.style.display = btn.id === "bank" ? "block" : "none";
        momoQRCodeDiv.innerHTML = "";
    }));

    // Bấm tiếp tục
    continueBtn.addEventListener("click", async () => {
        const method = momoBtn.classList.contains("active") ? "momo" :
                       bankBtn.classList.contains("active") ? "bank" : null;
if (!method) {
        momoBtn.classList.add("error");
        bankBtn.classList.add("error");

        [momoBtn, bankBtn].forEach(btn => {
            btn.addEventListener("click", () => {
                momoBtn.classList.remove("error");
                bankBtn.classList.remove("error");
            }, { once: true });
        });

        return;
    }

    // Nếu chưa chọn ngân hàng
    if (method === "bank" && !bankSelect.value) {
        bankSelect.classList.add("error");

        bankSelect.addEventListener("change", () => {
            bankSelect.classList.remove("error");
        }, { once: true });

        alert("Vui lòng chọn ngân hàng!");
        return;
    }

    momoBtn.classList.remove("error");
    bankBtn.classList.remove("error");
    bankSelect.classList.remove("error");        
        const totalPrice = totalPriceEl.textContent.replace(/\D/g,'');
        const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    
        try {
            //Gửi yêu cầu lưu đơn trạng thái "Chờ xác nhận thanh toán"
            const formData = new FormData();
            formData.append("table_number", tableNumber);
            formData.append("action", "pay");
            formData.append("method", method);
    
            const res = await fetch("/Managing_Restaurant/PHP/Oder.php", {
                method: "POST",
                body: formData
            });
    
            const data = await res.json();
            if(data.status !== "success"){
                alert(" Lưu đơn thất bại: " + (data.message || ""));
                return;
            }
    
    
            // Mở app thanh toán
            if(method === "momo"){
                const momoUrl = `momo://pay?amount=${totalPrice}&phone=${merchant.momo}`;
                const fallbackUrl = /Android/i.test(navigator.userAgent)
                    ? "https://play.google.com/store/apps/details?id=com.mservice.momotransfer"
                    : "https://apps.apple.com/vn/app/momo/id918751285";
    
                if(isMobile){
                    window.location.href = momoUrl;
                    setTimeout(()=> window.location.href = fallbackUrl, 1200);
                } else {
                    momoQRCodeDiv.innerHTML = "";
                    new QRCode(momoQRCodeDiv, { text: momoUrl, width:200, height:200 });
                }
            } else if(method === "bank"){
                const bankApp = bankSelect.value;
                if(!bankApp){
                    alert("Vui lòng chọn ngân hàng!");
                    return;
                }
                let bankUrl = "";
                switch(bankApp){
                    case "mbbank": bankUrl=`mbbank://payment?amount=${totalPrice}&account=${merchant.bank.account}`; break;
                    case "tpbank": bankUrl=`tpbank://payment?amount=${totalPrice}&account=${merchant.bank.account}`; break;
                    case "vietcombank": bankUrl=`vietcombank://payment?amount=${totalPrice}&account=${merchant.bank.account}`; break;
                    default: alert("Ngân hàng chưa hỗ trợ!"); return;
                }
    
                if(isMobile){
                    window.location.href = bankUrl;
                    setTimeout(()=> alert("Không tìm thấy app ngân hàng, vui lòng thanh toán thủ công."), 1200);
                } else {
                    alert(" Vui lòng dùng điện thoại để thanh toán.");
                }
            }
    
        } catch (err) {
            console.error("Lỗi khi xử lý thanh toán:", err);
            alert("Có lỗi xảy ra, vui lòng thử lại!");
        }
    });
    
});
