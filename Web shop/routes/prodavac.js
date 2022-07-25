var express = require('express');
var router = express.Router();
const obj = require("../storage/obj");
var multer  = require( 'multer' );

var storage = multer.diskStorage(
    {
        destination: 'public/images/artikli/',
        filename: function ( req, file, cb ) {
            cb( null, file.originalname );
        }
    }
);

var upload = multer( { storage: storage } );

var storage2 = multer.diskStorage(
    {
        destination: 'public/images/trgovci/',
        filename: function ( req, file, cb ) {
            cb( null, file.originalname );
        }
    }
);

var upload2 = multer( { storage: storage2 } );

// Ovdje ulazimo kad je ruta localhost:3000/prodavac

router.get('/', obj.getAllCategories, obj.getSellerInfo, obj.getAllArticlesForSeller, obj.getSellerId,
    obj.getCommentsForSeller, obj.getSellerRating, function(req, res, next) {
    if(req.sellerInfo && req.articles){
        res.render('profil-prodavac', { categories: req.categories, sellerInfo: req.sellerInfo,
            articles: req.articles, comments: req.comments, ocjena: req.ocjena } );
    }
});

router.get('/dodajArtikl', obj.getAllCategories, function(req, res, next) {
    res.render('forma-dodaj-artikl', { categories: req.categories });
});

router.post('/dodajArtikl', upload.single('avatar'), obj.addArticleforSeller, obj.getArticleIdByBody,
    obj.addArticleCategories, obj.changeArticlePicture, function(req, res, next) {
    if(req.articleAdded) {
        res.redirect('/prodavac');
    }
    else{
        res.send("Artikl nije dodat!");
    }
});

router.post('/urediProfil', obj.getSellerId, obj.changeProfile, function(req, res, next) {
    if(req.sellerProfileChanged) {
        res.sendStatus(200);
    }
});

router.post('/urediArtikl', obj.changeArticle, obj.deleteAllArticleCategories, obj.addArticleCategoriesSellerChanged,
    function(req, res, next) {
    if(req.articleChanged) {
        res.sendStatus(200);
    }
});

router.post('/ukloniArtikl', obj.removeArticle, function(req, res, next) {
    if(req.articleRemoved) {
        res.sendStatus(200);
    }
    else res.sendStatus(404);
});

router.post('/artikl/:id_artikla/promijeniSliku', upload.single('avatar'), obj.changeArticlePicture,
    function(req, res, next) {
    res.redirect('/prodavac');
});

router.get('/narudzbe', obj.getSellerId, obj.getNewOrdersForSeller, obj.getProcessedOrders, obj.getUndeliveredOrders,
    obj.getTotalProfit, function(req, res, next) {
    res.render('prodavac-narudzbe', { orders: req.orders, processedOrders: req.processedOrders,
        undeliveredOrders: req.undeliveredOrders, profit: req.profit });
});

router.post('/potvrdiNarudzbu/:id_narudzbe', obj.acceptOrder, obj.notifyBuyerViaEmailStatusChanged,
    function(req, res, next) {
    res.sendStatus(200);
});

router.post('/odbijNarudzbu/:id_narudzbe', obj.rejectOrder, obj.notifyBuyerViaEmailStatusChanged,
    function(req, res, next) {
    res.sendStatus(200);
});

router.post('/isporuciNarudzbu/:id_narudzbe', obj.deliverOrder, obj.notifyBuyerViaEmailStatusChanged,
    function(req, res, next) {
    res.sendStatus(200);
});

router.post('/promijeniProfilnu', upload2.single('avatar'), obj.getSellerId, obj.updateSellerProfilePic, function(req, res, next) {
    res.redirect('/prodavac');
});

router.post('/promijeniPozadinu', upload2.single('avatar'), obj.getSellerId, obj.updateSellerBackgroundPic, function(req, res, next) {
    res.redirect('/prodavac');
});

router.post('/promijeniLozinku', obj.changeSellerPassword, function(req, res, next) {
    if(req.sellerPasswordChanged) {
        res.sendStatus(200);
    }
});

module.exports = router;