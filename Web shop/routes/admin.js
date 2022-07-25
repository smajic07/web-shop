var express = require('express');
var router = express.Router();
const obj = require("../storage/obj");

// Ovdje ulazimo kad je ruta localhost:3000/admin

router.get('/', obj.getAllSeller, obj.getAllBuyer, function(req, res, next) {
    res.render('admin', { sellerInfo: req.sellerInfo, buyerInfo: req.buyerInfo } );
});

router.get('/kategorije', obj.getAllCategories, function(req, res, next) {
    res.render('admin-kategorije', { categories: req.categories } );
});

router.get('/statistika', obj.sellerBuyerRatio, obj.statusRatio, obj.articleCategories, obj.popularArticles2,
    obj.ordersStatus, function(req, res, next) {
    res.render('admin-statistika', { ratio: req.ratio, status: req.status, artCat: req.artCat, popArt: req.popArt,
        ordStatus: req.ordStatus });
});

router.post('/promijeniStatus', obj.changeUserStatus, function(req, res, next) {
    if(req.userStatusChanged) {
        res.sendStatus(200);
    }
});

router.post('/izbrisiKategorije', obj.deleteFromSellerCategories, obj.deleteFromBuyerCategories,
    obj.deleteFromArticlesCategories, obj.deleteFromCategories, function(req, res, next) {
    if(req.deletedFromCategories) {
        res.sendStatus(200);
    }
});

router.post('/dodajKategorije', obj.addCategories, function(req, res, next) {
    if(req.categoriesAdded) {
        res.sendStatus(200);
    }
});

module.exports = router;