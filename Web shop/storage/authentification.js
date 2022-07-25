const pool = require("../storage/pool");
const jwt = require("jsonwebtoken");

var freeRoutes = ['/', '/favicon.ico', '/registracija-prodavac', '/registracija-kupac', '/login'];
var sellerRoutes = ['/prodavac', '/prodavac/narudzbe', '/prodavac/potvrdiNarudzbu', '/prodavac/odbijNarudzbu', '/prodavac/isporuciNarudzbu',
    '/prodavac/dodajArtikl', '/prodavac/urediProfil', '/prodavac/urediArtikl', '/prodavac/ukloniArtikl', '/prodavac/promijeniProfilnu',
    '/prodavac/promijeniPozadinu', '/prodavac/promijeniLozinku', '/logout', '/poruke/poruke'];
var buyerRoutes = ['/kupac', '/kupac/profil', '/kupac/promijeniProfilnu', '/kupac/promijeniPozadinu',
    '/kupac/promijeniLozinku', '/kupac/urediInterese', '/kupac/dodajKomentar', '/kupac/ocijeniProdavaca', '/kupac/ocijeniArtikl',
    '/logout', '/poruke/poruke'];
var adminRoutes = ['/admin', '/admin/promijeniStatus', '/admin/kategorije', '/admin/statistika',
    '/admin/izbrisiKategorije', '/admin/dodajKategorije', '/logout', '/poruke/poruke'];

var authentification = {
    isFreeRoute: function (req, res, next) {
        console.log("Ruta je: " + req.url);
        for (let i = 0; i < freeRoutes.length; i++) {
            if (req.url == freeRoutes[i]){
                req.freeRoute = true;
                console.log("Ruta je slobodna");
                break;
            }
        }
        next();
    },
    validateToken: function (req, res, next) {
        if(!req.freeRoute) {
            try {
                req.decodedToken = jwt.verify(req.cookies.user, 'smajke');
                console.log("Token validan, dekodiran je: "); // dekodiran token
                console.log(req.decodedToken);
            } catch (err) {
                console.log("NEISPRAVAN TOKEN");
                res.clearCookie('user');
                res.clearCookie('status');
                console.log("Cookie očišćen");
                res.redirect('/login');
            }
            req.validToken = true;
        }

        next();
    },
    getRole: function (req, res, next) {
        if(!req.freeRoute) {
            pool.query(`select type from users 
                        where username = $1;`,
                [req.decodedToken.username],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        console.log("ERROR PRI DOBAVLJANJU TIPA KORISNIKA");
                        return next();
                    }
                    if (result.rows[0]){
                        req.role = result.rows[0].type;
                        console.log("Tip korisnika uspješno dobijen!");
                    }

                    next();
                });
        }
        else next();
    },
    validRouteForRole: function (req, res, next) {
        if(req.role == 1) {
            for (let i = 0; i < sellerRoutes.length; i++) {
                if (req.url == sellerRoutes[i] || req.url.substring(0, 17) == '/prodavac/artikl/' ||
                    req.url.substring(0, 24) == '/prodavac/odbijNarudzbu/' || req.url.substring(0, 26) == '/prodavac/potvrdiNarudzbu/' ||
                    req.url.substring(0, 27) == '/prodavac/isporuciNarudzbu/' || req.url.substring(0, 15) == '/poruke/poruke/') {
                    req.validRouteForRole = true;
                    console.log("Validna ruta za Sellera!");
                    break;
                }
            }
        }
        else if(req.role == 2)
            for (let i = 0; i < buyerRoutes.length; i++) {
                if (req.url == buyerRoutes[i] || req.url.substring(0, 16) == '/kupac/pretraga/' ||
                    req.url.substring(0, 14) == '/kupac/profil/' || req.url.substring(0, 14) == '/kupac/artikl/' ||
                    req.url.substring(0, 16) == '/kupac/prodavac/' || req.url.substring(0, 16) == '/kupac/narudzba/' ||
                    req.url.substring(0, 22) == '/kupac/otkaziNarudzbu/' || req.url.substring(0, 15) == '/poruke/poruke/') {
                    req.validRouteForRole = true;
                    console.log("Validna ruta za Buyera!");
                    break;
                }
            }
        else if(req.role == 0) {
            for (let i = 0; i < adminRoutes.length; i++) {
                if (req.url == adminRoutes[i] || req.url.substring(0, 15) == '/poruke/poruke/'){
                    req.validRouteForRole = true;
                    console.log("Validna ruta za Admina!");
                    break;
                }
            }
        }

        next();
    },
}

module.exports = authentification;