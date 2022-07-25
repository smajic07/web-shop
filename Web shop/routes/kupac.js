var express = require('express');
var router = express.Router();
const obj = require("../storage/obj");
var multer  = require( 'multer' );
const jwt = require("jsonwebtoken");

var storage = multer.diskStorage(
    {
        destination: 'public/images/',
        filename: function ( req, file, cb ) {
            cb( null, file.originalname );
        }
    }
);

var upload = multer( { storage: storage } );

// Ovdje ulazimo kad je ruta localhost:3000/kupac

router.get('/', obj.popularArticles, obj.randomArticles, obj.getBuyerId, obj.getBuyerInterests, obj.recommendedArticles,
    obj.getAllCategories, function(req, res, next) {
    res.render('home-kupac', { popularArticles: req.popularArticles, randomArticles: req.randomArticles,
        recommendedArticles: req.recommendedArticles, categories: req.categories } );
});

router.get('/profil', obj.getBuyerInfo, obj.getAllCategories, obj.getBuyerId, obj.getBuyerInterests, obj.getOrders,
    obj.getTotalMoneySpent, function(req, res, next) {
    let status;
    if(req.cookies.status){
        req.decodedStatus = jwt.verify(req.cookies.status, 'smajke2');
        console.log(req.decodedStatus);
        status = 'Arhiviran';
    }
    res.render('profil-kupac', { buyerInfo: req.buyerInfo, categories: req.categories, interests: req.buyerInterests,
                                 orders: req.orders, total_spent: req.total_spent, status: status } );
});

router.post('/promijeniProfilnu', upload.single('avatar'), obj.getBuyerId, obj.changeProfilePicture,
    function(req, res, next) {
    res.redirect('/kupac/profil');
});

router.post('/promijeniPozadinu', upload.single('avatar'), obj.getBuyerId, obj.changeBackgroundPicture,
    function(req, res, next) {
    res.redirect('/kupac/profil');
});

router.post('/promijeniLozinku', obj.changeBuyerPassword, function(req, res, next) {
    if(req.buyerPasswordChanged) {
        res.sendStatus(200);
    }
});

router.post('/urediInterese', obj.getBuyerId, obj.deleteBuyerInterests, obj.addBuyerInterests,
    function(req, res, next) {
    if(req.interestsRemoved && req. interestsAdded){
        res.sendStatus(200);
    }
});

router.get('/pretraga/:naziv', obj.getAllSellersByName, obj.getAllArticlesByName, obj.getAllBuyersByName,
    obj.getAllCategories, function(req, res, next) {
    res.render('search', { naziv: req.params.naziv, sellers: req.sellers, articles: req.articles,
        buyers: req.buyers, categories: req.categories });
});

router.get('/pretraga/kategorija/:id_kategorije', obj.getCategoryName, obj.getAllSellersByCategory, obj.getAllArticlesByCategory,
    obj.getAllCategories, function(req, res, next) {
    res.render('search2', { naziv: req.naziv, sellers: req.sellers, articles: req.articles,
        categories: req.categories });
});

router.get('/profil/:username', obj.getBuyerByUsername, function(req, res, next) {
    if (req.buyerInfo) {
        if (req.buyerInfo.status === null) {
            res.render('profil-kupac-pregled', { buyerInfo: req.buyerInfo });
        } else {
            if (req.buyerInfo.status === 'Arhiviran') res.send('Korisnik je arhiviran!');
            if (req.buyerInfo.status === 'Blokiran') res.send('Korisnik je blokiran!');
            if (req.buyerInfo.status === 'Blokiran 15 dana') res.send('Korisnik je blokiran na 15 dana!');
        }
    } else {
        res.sendStatus(404);
    }
});

router.get('/artikl/:id_artikla', obj.getArticleById, obj.getArticleRating, obj.getBuyerId,
    obj.getRatingByBuyerForArticle, function(req, res, next) {
    if (req.article) {
        let status;
        if(req.cookies.status){
            req.decodedStatus = jwt.verify(req.cookies.status, 'smajke2');
            console.log(req.decodedStatus);
            status = 'Arhiviran';
        }
        if (req.article.removed === null) {
            res.render('pregled-artikl', { article: req.article, ocjena: req.ocjena, ocjena2: req.ocjena2, status: status });
        } else { // iako nikad neće doći do ovog, ali nema veze...
            res.send("Artikl je obrisan od strane prodavača!");
        }
    } else {
        res.sendStatus(404);
    }
});

router.get('/prodavac/:id_prodavaca', obj.getSellerById, obj.getAllArticlesForSeller, obj.getCommentsForSeller,
    obj.getSellerRating, obj.getBuyerId, obj.getRatingByBuyer, obj.getAllCategories, function(req, res, next) {
    if (req.sellerInfo) {
        let status;
        if(req.cookies.status){
            req.decodedStatus = jwt.verify(req.cookies.status, 'smajke2');
            console.log(req.decodedStatus);
            status = 'Arhiviran';
        }
        res.render('pregled-prodavac', { sellerInfo: req.sellerInfo, articles: req.articles, comments: req.comments,
                                         ocjena: req.ocjena, ocjena2: req.ocjena2, categories: req.categories, status: status });
    } else {
        res.sendStatus(404);
    }
});

router.post('/narudzba/dodaj/:id_sellera/:id_artikla/:kolicina', function(req, res, next) {
    var narudzba = jwt.verify(req.cookies.narudzba, 'narudzba').narudzba;
    var treba_dodati = true;
    var id_sellera = parseInt(req.params.id_sellera);
    var id_artikla = parseInt(req.params.id_artikla);
    var kolicina = parseInt(req.params.kolicina);
    console.log(id_sellera + "  " + id_artikla + "  " + kolicina);
    for(let i=0; i<narudzba.length; i++){
        if(id_sellera === narudzba[i].seller_id){
            treba_dodati = false;
            let postoji_artikl = false;
            for(let j=0; j<narudzba[i].nizArtikala.length; j++){
                if(id_artikla === narudzba[i].nizArtikala[j]){
                    narudzba[i].kolicine[j] += kolicina;
                    postoji_artikl = true;
                    break;
                }
            }
            if(!postoji_artikl){
                narudzba[i].nizArtikala.push(id_artikla);
                narudzba[i].kolicine.push(kolicina);
            }
            break;
        }
    }
    if(treba_dodati){
        nizArtikakla = new Array();
        nizArtikakla.push(id_artikla);
        kolicine = new Array();
        kolicine.push(kolicina);
        let niz = {
            seller_id: id_sellera,
            nizArtikala: nizArtikakla,
            kolicine: kolicine
        };
        narudzba.push(niz);
    }

    console.log(narudzba);

    narudzba = jwt.sign({ narudzba: narudzba }, 'narudzba');
    res.cookie('narudzba', narudzba, { overwrite: true });

    res.sendStatus(200);
});

router.post('/narudzba/dajArtikle', obj.getAllArticlesFromOrder, function(req, res) {
    for(let i=0; i<req.artikli.length; i++){
        for(let j=0; j<req.kolicine.length; j++){
            if(req.artikli[i].id === req.idovi_artikala[j]){
                req.artikli[i].kolicina = req.kolicine[j];
                break;
            }
        }
    }
    res.json({
        artikli: req.artikli
    });
});

router.post('/narudzba/ukloni/:id_sellera/:id_artikla/:kolicina', function(req, res, next) {
    var narudzba = jwt.verify(req.cookies.narudzba, 'narudzba').narudzba;
    var id_sellera = parseInt(req.params.id_sellera);
    var id_artikla = parseInt(req.params.id_artikla);
    var kolicina = req.params.kolicina;
    for(let i=0; i<narudzba.length; i++){
        if(id_sellera === narudzba[i].seller_id) {
            for (let j = 0; j < narudzba[i].nizArtikala.length; j++) {
                if (id_artikla === narudzba[i].nizArtikala[j]) {
                    if(kolicina==='skroz'){
                        narudzba[i].nizArtikala.splice(j, 1);
                        narudzba[i].kolicine.splice(j, 1);
                        if(narudzba[i].nizArtikala.length === 0){
                            narudzba.splice(i, 1);
                        }
                    }
                    else{
                        narudzba[i].kolicine[j] = parseInt(kolicina);
                    }
                    narudzba = jwt.sign({ narudzba: narudzba }, 'narudzba');
                    res.cookie('narudzba', narudzba, { overwrite: true });
                    res.sendStatus(200);
                    return;
                }
            }
        }
    }
    res.sendStatus(404);
});

router.post('/narudzba/potvrdi', obj.getBuyerId, obj.processOrder, obj.notifySellersViaEmail, obj.notifyBuyerViaEmail,
    function(req, res, next) {
    res.sendStatus(200);
});

router.post('/otkaziNarudzbu/:id_narudzbe', obj.cancelOrder, obj.notifyBuyerViaEmailStatusChanged,
    function(req, res, next){
    res.sendStatus(200);
});

router.post('/dodajKomentar', obj.getBuyerId, obj.addComment, function(req, res, next){
    res.redirect('/kupac/prodavac/' + req.body.seller_id);
});

router.post('/ocijeniProdavaca', obj.getBuyerId, obj.rateSeller, function(req, res, next){
    res.sendStatus(200);
});

router.post('/ocijeniArtikl', obj.getBuyerId, obj.rateArticle, function(req, res, next){
    res.sendStatus(200);
});

router.post('/prodavac/dajArtiklePoKategoriji', obj.getArticlesForSellerByCategory, function(req, res, next){
    res.json({
        artikliS: req.artikliS
    });
});

module.exports = router;