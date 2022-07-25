var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var authentification = require("./storage/authentification");

var adminRouter = require('./routes/admin');
var prodavacRouter = require('./routes/prodavac');
var kupacRouter = require('./routes/kupac');
var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(authentification.isFreeRoute, authentification.validateToken, authentification.getRole,
    authentification.validRouteForRole, function(req, res, next){

  console.log("Ruta slobodna: " + req.freeRoute);
  if(!req.freeRoute) {
    if(req.validToken){
      console.log("Tip korisnika: " + req.role);
      console.log("Ruta validna za tip: " + req.validRouteForRole);
      if(!req.validRouteForRole) {
        res.render('zabranjena-ruta');
      }
      else next();
    } else {
      res.redirect('/login');
    }
  }
  else next();
});

app.use('/admin', adminRouter);
app.use('/prodavac', prodavacRouter);
app.use('/kupac', kupacRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
