(function () {
    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('nav-menu');
    if (!toggle || !menu) {
        return;
    }

    function setOpen(open) {
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
        setOpen(!menu.classList.contains('is-open'));
    });

    document.addEventListener('click', function (e) {
        if (!menu.classList.contains('is-open')) {
            return;
        }
        var t = e.target;
        if (t instanceof Node && !toggle.contains(t) && !menu.contains(t)) {
            setOpen(false);
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            setOpen(false);
        }
    });
})();
