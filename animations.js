document.addEventListener('DOMContentLoaded', () => {
    // 1. Sélectionner tous les éléments à animer
    // On cible les titres de section, les sous-titres et les cartes.
    const elementsToAnimate = document.querySelectorAll('.section-title, .section-subtitle, .card');

    // 2. Ajouter la classe d'état initial à tous ces éléments
    elementsToAnimate.forEach(element => {
        element.classList.add('scroll-animate');
    });

    // 3. Créer l'observateur d'intersection
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Si l'élément est dans le viewport (la fenêtre visible)
            if (entry.isIntersecting) {
                // On ajoute la classe 'is-visible' pour déclencher l'animation
                entry.target.classList.add('is-visible');
                
                // On arrête d'observer cet élément pour ne pas répéter l'animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        // Options de l'observateur
        root: null, // Observe par rapport au viewport
        rootMargin: '0px',
        threshold: 0.1 // Déclenche l'animation quand 10% de l'élément est visible
    });

    // 4. Lancer l'observation sur chaque élément
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
});