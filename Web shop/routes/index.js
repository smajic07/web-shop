var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const obj = require("../storage/obj");

// Ovdje ulazimo kad je ruta localhost:3000/

router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/registracija-prodavac', obj.getAllCategories, function(req, res, next) {
  res.render('forma-registracija-prodavac', { categories: req.categories });
});

router.post('/registracija-prodavac', obj.registerUserForSeller, obj.registerSeller, obj.getSellerIdByBody,
    obj.addSellerCategories, function(req, res, next) {
  if (!req.userSellerRegistered) {
    res.send("Username već u upotrebi!");
  }
  else if (!req.sellerRegistered) {
    res.send("Greška pri registrovanju Prodavača!");
  }
  else{
    res.redirect('/login');
  }
});

router.get('/registracija-kupac', obj.getAllCategories, function(req, res, next) {
  res.render('forma-registracija-kupac', { categories: req.categories });
});

router.post('/registracija-kupac', obj.registerUserForBuyer, obj.registerBuyer, obj.getBuyerIdByBody,
    obj.addBuyerCategories, function(req, res, next) {
  if (!req.userBuyerRegistered) {
    res.send("Username već u upotrebi!");
  }
  else if (!req.buyerRegistered) {
    res.send("Greška pri registrovanju Kupca!");
  }
  else res.redirect('/login');
});

router.get('/login', function(req, res, next) {
  res.render('forma-login');
});

router.post('/login', obj.checkLoginData, obj.resetUserStatusToNull, function(req, res, next) {
  if(req.loginSuccessfull) {
    console.log("Kriptujem u token: " + req.loginData.username);
    var token = jwt.sign(req.loginData, 'smajke'); // kriptovan token
    console.log("Kriptovani token: " + token);
    res.cookie('user', token); // ne moramo stari cookie očisitit, jer će svakako bit overwrittean sa novim, isto i sa narudzbom ispod
    if(req.status && req.status === 'Arhiviran'){
      var token2 = jwt.sign(req.status, 'smajke2'); // kriptovan token
      res.cookie('status', token2);
    }
    if(req.role == 1){
      res.redirect('/prodavac');
    }
    else if(req.role == 2){
      let narudzba = jwt.sign({ narudzba: [] }, 'narudzba');
      console.log("Kriptovana narudzba: " + narudzba);
      res.cookie('narudzba', narudzba);
      res.redirect('/kupac');
    }
    else res.redirect('/admin');
  }
  else if (req.odblokiraj){
    res.redirect(307, '/login');
  }
  else if (req.status){
    if (req.status === 'Blokiran') res.render('blokiran');
    else if (req.status === 'Blokiran 15 dana') res.render('blokiran15');
  }
  else res.redirect('/login');
});

router.get('/logout', function(req, res, next) {
  res.clearCookie('user');
  res.clearCookie('narudzba');
  res.clearCookie('status');
  res.redirect('/');
});

var io = null;
var aktivni = [];
var i = 1;

router.get('/poruke/poruke', obj.getUserType, obj.getBuyersForMessages, obj.getSellersForMessages, obj.getAdminsForMessages, obj.getUserInfo, function(req, res, next) {
  aktivni.push({ user: req.decodedToken.username });
  if(!io){
    io = require('socket.io')(req.connection.server);
    io.on('connection', function(socket){
      aktivni[aktivni.length-1].socketID = socket.id;
      console.log(aktivni);
      i++;
      socket.on('disconnect', function(){
        console.log("Diskonektovan");
        for(let i=0; i<aktivni.length; i++){
          if(aktivni[i].socketID == socket.id){
            aktivni.splice(i, 1);
            console.log(aktivni);
            break;
          }
        }
      });
      socket.on('klijent_salje_poruku', function(d){
        console.log(d);
        obj.saveMessageIntoDB(d);
        for(let i=0; i<aktivni.length; i++){
          if(aktivni[i].user == d.usernameR){
            d = JSON.stringify(d);
            socket.broadcast.to(aktivni[i].socketID).emit('poruka', d);
            break;
          }
        }
      });
    });
  }
  if(req.type == 2) res.render('porukeKupac', { buyers: req.buyers, sellers: req.sellers, admins: req.admins, korisnik: req.korisnik });
  else if(req.type == 1) res.render('porukeProdavac', { buyers: req.buyers, sellers: req.sellers, admins: req.admins, korisnik: req.korisnik });
  else if(req.type == 0) res.render('porukeAdmin', { buyers: req.buyers, sellers: req.sellers, admins: req.admins, korisnik: req.korisnik });
});

router.post('/poruke/poruke/:primalac', obj.getUserId, obj.getAllMessagesForUserAndReciever, function (req, res, next) {
  res.json({
    messages: req.messages
  });
});

module.exports = router;