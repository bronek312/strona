export function initNavigation() {
    document.querySelectorAll('.sidebar a[data-target]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            document.getElementById(link.dataset.target).classList.add('active');
        });
    });
}