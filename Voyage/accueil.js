document.addEventListener("DOMContentLoaded", function() {
    let currentIndex = 0;
    const images = document.querySelectorAll(".carousel-item");
    const totalImages = images.length;
    const prevButton = document.querySelector(".prev");
    const nextButton = document.querySelector(".next");

    function showSlide(index) {
        if (index < 0) {
            currentIndex = totalImages - 1;
        } else if (index >= totalImages) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        const offset = -currentIndex * 100;
        document.querySelector(".carousel-images").style.transform = `translateX(${offset}%)`;
    }

    prevButton.addEventListener("click", function() {
        showSlide(currentIndex - 1);
    });

    nextButton.addEventListener("click", function() {
        showSlide(currentIndex + 1);
    });

    // Défilement automatique toutes les 5 secondes
    setInterval(() => {
        showSlide(currentIndex + 1);
    }, 5000);
});