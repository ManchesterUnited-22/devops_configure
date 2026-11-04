const stars = document.querySelectorAll('.star-rating span');
const ratingInput = document.getElementById('rating-value');
let currentRating = 0;

stars.forEach(star => {
    star.addEventListener('mouseover', () => {
        const val = parseInt(star.getAttribute('data-value'));
        stars.forEach(s => s.classList.toggle('hover', parseInt(s.getAttribute('data-value')) <= val));
    });
    star.addEventListener('mouseout', () => {
        stars.forEach(s => s.classList.remove('hover'));
    });

    star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-value'));
        currentRating = val;
        ratingInput.value = val;
        stars.forEach(s => s.classList.toggle('selected', parseInt(s.getAttribute('data-value')) <= val));
    });
});

const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', function(e){
    e.preventDefault(); 

    const formData = new FormData(contactForm);

    fetch('/Managing_Restaurant/PHP/Contact.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json()) 
    .then(data => {
        alert(data.message); 
        if(data.status === "success") {
            contactForm.reset(); 
            ratingInput.value = 0;
            stars.forEach(s => s.classList.remove('selected'));
        }
    })
    .catch(err => console.error(err));
});
