export default function aplicarEnlacesFooterPorRol() {
    const rol = localStorage.getItem("rol");

    const enlaces = document.querySelectorAll("#dashboardFooterLinks a");

    enlaces.forEach(enlace => {
        const rolesPermitidos = enlace.getAttribute("data-roles");

        if (!rolesPermitidos) return;

        const rolesArray = rolesPermitidos.split(",");

        if (!rolesArray.includes(rol)) {
            enlace.style.display = "none";
        }
    });
}