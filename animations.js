document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GESTION DES ANIMATIONS DÉCALÉES (STAGGER) ---
    // On sélectionne les conteneurs (grilles) dont les enfants doivent apparaître en décalé.
    const staggeredContainers = document.querySelectorAll('.grid-2, .grid-3');

    staggeredContainers.forEach(container => {
        const items = container.querySelectorAll('.card'); // On cible les cartes à l'intérieur
        items.forEach((item, index) => {
            // On applique un délai de transition qui augmente pour chaque carte (0ms, 100ms, 200ms, etc.)
            item.style.transitionDelay = `${index * 100}ms`;
        });
    });

    // --- 2. OBSERVATEUR D'INTERSECTION POUR TOUTES LES ANIMATIONS ---
    // On cible tous les éléments qui doivent être animés au défilement.
    const elementsToAnimate = document.querySelectorAll('.section-title, .section-subtitle, .card');

    // On ajoute la classe d'état initial à tous ces éléments pour les préparer.
    elementsToAnimate.forEach(element => {
        element.classList.add('scroll-animate');
    });

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

    // On lance l'observation sur chaque élément à animer.
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
});