import aplicarEnlacesFooterPorRol from "./footer-roles.js";

fetch('../components/footer.html')
    .then(res => res.text())
    .then(data => {
    document.getElementById('footer-container').innerHTML = data;

    //logica de cuales opciones se muestran en el footer, dependiendo del rol
    aplicarEnlacesFooterPorRol();

    })
    .catch(err => console.error('Error al cargar el footer: ', err));
    