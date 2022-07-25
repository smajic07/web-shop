const pool = require("./pool");
var SHA256 = require("crypto-js/sha256");
const jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');

var obj = {
    getAllCategories: function (req, res, next) {
        pool.query(`select * from categories;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("NISU DOBIJENE KATEGORIJE");
                    return next();
                }
                req.categories = result.rows;
                console.log("Uspješno dobijene sve kategorije!");

                next();
            });
    },
    registerUserForSeller: function (req, res, next) {
        let cryptedPassword = JSON.stringify(SHA256(req.body.password).words);
        pool.query(`insert into users(username, password, type)
                    values ($1, $2, 1);`,
                    [req.body.username, cryptedPassword],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("NIJE REGISTROVAN USER ZA SELLERA");
                    return next();
                }
                req.userSellerRegistered = true;
                console.log("Uspješno registrovan user za Sellera!");

                next();
            });
    },
    registerSeller: function (req, res, next) {
        pool.query(`insert into seller(company_name, telephone_number, email, headquarters_street_name, headquarters_city, users_id) 
                    values ($1, $2, $3, $4, $5, (select id from users 
                                                 where username = $6));`,
                    [req.body.company_name, req.body.telephone_number, req.body.email,
                     req.body.headquarters_street_name, req.body.headquarters_city, req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("SELLER NIJE REGISTROVAN");
                    return next();
                }
                req.sellerRegistered = true;
                console.log("Seller je uspješno registrovan!");

                next();
            });
    },
    getSellerIdByBody: function (req, res, next) {
        pool.query(`select s.id from seller s
                    inner join users u on u.id = s.users_id
                    where u.username = $1;`,
            [req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID SELLERA NIJE PRONAĐEN");
                    return next();
                }
                req.sellerIdGotten = true;
                if(result.rows[0]) req.sellerId = result.rows[0].id;
                console.log("ID Sellera uspješno dobijen!");

                next();
            });
    },
    addSellerCategories: function (req, res, next) {
        var nizIDovaKategorija = req.body.check;
        console.log("Kategorije sellera: " + nizIDovaKategorija);

        pool.query(`call dodaj_u_seller_categories($1, $2);`,
            [req.sellerId, nizIDovaKategorija],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE ZA SELLERA NISU DODATE");
                    return next();
                }
                console.log("Kategorije za sellera uspješno dodate!");

                next();
            });
    },
    registerUserForBuyer: function (req, res, next) {
        let cryptedPassword = JSON.stringify(SHA256(req.body.password).words);
        pool.query(`insert into users(username, password, type)
                    values ($1, $2, 2);`,
            [req.body.username, cryptedPassword],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("NIJE REGISTROVAN USER ZA BUYERA");
                    return next();
                }
                req.userBuyerRegistered = true;
                console.log("Uspješno registrovan user za Buyera!");

                next();
            });
    },
    registerBuyer: function (req, res, next) {
        pool.query(`insert into buyer(first_name, last_name, email, users_id) 
                    values($1, $2, $3, (select id from users 
                                        where username = $4));`,
            [req.body.first_name, req.body.last_name, req.body.email, req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("BUYER NIJE REGISTROVAN");
                    return next();
                }
                req.buyerRegistered = true;
                console.log("Buyer je uspješno registrovan!");

                next();
            });
    },
    getBuyerIdByBody: function (req, res, next) {
        pool.query(`select b.id from buyer b
                    inner join users u on u.id = b.users_id
                    where u.username = $1;`,
            [req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID BUYERA NIJE PRONAĐEN");
                    return next();
                }
                req.buyerIdGotten = true;
                if(result.rows[0]) req.buyerId = result.rows[0].id;
                console.log("ID Buyera uspješno dobijen!");

                next();
            });
    },
    addBuyerCategories: function (req, res, next) {
        var nizIDovaKategorija = req.body.check;
        console.log("Interesi buyera: " + nizIDovaKategorija);

        pool.query(`call dodaj_u_buyer_categories($1, $2);`,
            [req.buyerId, nizIDovaKategorija],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE ZA BUYERA NISU DODATE");
                    return next();
                }
                console.log("Kategorije za buyera uspješno dodate!");

                next();
            });
    },
    checkLoginData: function(req, res, next){
        let cryptedPassword = JSON.stringify(SHA256(req.body.password).words);
        pool.query(`select username, password, type, status, da_li_odblokirati_usera(vrijeme_izmjene) as odblokirati from users
                    where username = $1;`,
            [req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("GREŠKA PRI LOGINU!");
                    return next();
                }
                if(result.rows.length == 0){
                    console.log("Takav username ne postoji!");
                }
                else if (cryptedPassword !== result.rows[0].password){
                    console.log("Pogrešna šifra!");
                }
                else if(result.rows[0].status === 'Blokiran'){
                    console.log("Korisnik je blokiran!");
                    req.status = result.rows[0].status;
                }
                else if(result.rows[0].status === 'Blokiran 15 dana'){
                    console.log("Korisnik je blokiran na 15 dana!");
                    if(result.rows[0].odblokirati){
                        req.odblokiraj = true;
                        console.log("Korisnika treba odblokirati!");
                    }
                    else req.status = result.rows[0].status;
                }
                else if(result.rows[0].status === 'Arhiviran'){
                    console.log("Korisnik je arhiviran!");
                    req.status = result.rows[0].status;
                    req.loginSuccessfull = true;
                    req.loginData = { username: result.rows[0].username };
                    req.role = result.rows[0].type;
                    console.log("Log in uspješan!");
                }
                else {
                    req.status = result.rows[0].status;
                    req.loginSuccessfull = true;
                    req.loginData = { username: result.rows[0].username };
                    req.role = result.rows[0].type;
                    console.log("Log in uspješan!");
                }

                next();
            });
    },
    resetUserStatusToNull: function (req, res, next) {
        if(req.odblokiraj) {
            pool.query(`update users
                        set status = null, vrijeme_izmjene = (select now())
                        where username = $1;`,
                [req.body.username],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        console.log("STATUS USERA NIJE RESTARTOVAN");
                        return next();
                    }
                    console.log("Status usera uspješno restartovan!");

                    next()
                });
        }
        else next()
    },
    getSellerInfo: function (req, res, next) {
        pool.query(`select u.username, s.company_name, s.telephone_number, s.email, s.headquarters_street_name, 
                    s.headquarters_city, s.profile_picture, s.background_picture from users u 
                    inner join seller s on s.users_id = u.id
                    where u.username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O SELLERU NISU DOBIJENI");
                    return next();
                }
                req.sellerInfo = result.rows[0];
                console.log("Podaci o Selleru uspješno dobijeni!");

                next();
            });
    },
    getBuyerInfo: function (req, res, next) {
        pool.query(`select u.username, b.first_name, b.last_name, b.email, b.profile_picture, b.background_picture from users u 
                    inner join buyer b on b.users_id = u.id
                    where u.username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O BUYERU NISU DOBIJENI");
                    return next();
                }
                req.buyerInfo = result.rows[0];
                console.log("Podaci o Buyeru uspješno dobijeni!");

                next();
            });
    },
    addArticleforSeller: function (req, res, next) {
        pool.query(`insert into articles(article_name, description, quantity, unit_price, seller_id)
                    values($1, $2, $3, $4, (select s.id from seller s
                                            inner join users u on s.users_id = u.id
                                            where u.username = $5));`,
            [req.body.article_name, req.body.description, req.body.quantity, req.body.unit_price, req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKL NIJE DODAT");
                    return next();
                }
                console.log("Artikl uspješno dodat!");

                next();
            });
    },
    getArticleIdByBody: function (req, res, next) {
        pool.query(`select a.id from articles a
                    inner join seller s on s.id = a.seller_id
                    inner join users u on u.id = s.users_id
                    where u.username = $1 and a.description = $2;`,
            [req.decodedToken.username, req.body.description],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID ARTIKLA NIJE PRONAĐEN");
                    return next();
                }
                console.log(result.rows);
                req.articleIdGotten = true;
                if(result.rows[0]) req.articleId = result.rows[0].id;
                console.log("ID Artikla uspješno dobijen!");

                next();
            });
    },
    addArticleCategories: function (req, res, next) {
        var nizIDovaKategorija = req.body.check;
        console.log("Kategorije artikla: " + nizIDovaKategorija);

        pool.query(`call dodaj_u_articles_categories($1, $2);`,
            [req.articleId, nizIDovaKategorija],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE ZA ARTIKL NISU DODATE");
                    return next();
                }
                req.articleAdded = true;
                console.log("Kategorije za artikl uspješno dodate!");

                next();
            });
    },
    getAllArticlesForSeller: function (req, res, next) {
        pool.query(`select a.*, daj_sve_kategorije_artikla(a.id) as kategorije from articles a
                    inner join seller s on s.id = a.seller_id
                    inner join users u on u.id = s.users_id
                    where a.removed is null and u.username = $1;`,
            [req.sellerInfo.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKLI ZA SELLERA NISU DOBIJENI");
                    return next();
                }
                req.articles = result.rows;
                console.log("Svi artikli za Sellera uspješno dobijeni!");

                next();
            });
    },
    getAllSeller: function (req, res, next) {
        pool.query(`select u.username, u.status, s.company_name, s.telephone_number, s.email, s.headquarters_street_name, 
                    s.headquarters_city from users u 
                    inner join seller s on s.users_id = u.id;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O SVIM SELLERIMA NISU DOBIJENI");
                    return next();
                }
                req.sellerInfo = result.rows;
                console.log("Podaci o svim Sellerima uspješno dobijeni!");

                next();
            });
    },
    getAllBuyer: function (req, res, next) {
        pool.query(`select u.username, u.status, b.first_name, b.last_name, b.email from users u
                    inner join buyer b on b.users_id = u.id;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O SVIM BUYERIMA NISU DOBIJENI");
                    return next();
                }
                req.buyerInfo = result.rows;
                console.log("Podaci o svim Buyerima uspješno dobijeni!");

                next();
            });
    },
    changeUserStatus: function (req, res, next) {
        let status = req.body.status;
        if(status == 1) {
            status = 'Arhiviran';
        } else if(status == 2) {
            status = 'Blokiran 15 dana';
        } else if(status == 3) {
            status = 'Blokiran'
        } else if(status == 4) {
            status = null;
        } else {
            console.log("MIJENJAN STATUS ZA USERA NA FRONTU");
            next();
        }
        pool.query(`update users
                    set status = $1, vrijeme_izmjene = (select now())
                    where username = $2;`,
            [status, req.body.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("STATUS USERA NIJE PROMIJENJEN");
                    return next();
                }
                req.userStatusChanged = true;
                console.log("Status usera uspješno promijenjen!");

                next();
            });
    },
    getSellerId: function (req, res, next) {
        pool.query(`select s.id from seller s
                    inner join users u on u.id = s.users_id
                    where u.username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID SELLERA NIJE PRONAĐEN");
                    return next();
                }
                req.sellerIdGotten = true;
                if(result.rows[0]) req.sellerId = result.rows[0].id;
                console.log("ID Sellera uspješno dobijen!");

                next();
            });
    },
    changeProfile: function (req, res, next) {
        if(req.sellerIdGotten) {
            pool.query(`update seller
                        set company_name = $1, telephone_number = $2, email = $3, 
                        headquarters_street_name = $4, headquarters_city = $5
                        where id = $6;`,
                [req.body.company_name, req.body.telephone_number, req.body.email,
                 req.body.headquarters_street_name, req.body.headquarters_city, req.sellerId],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        console.log("PROFIL SELLERA NIJE UREĐEN");
                        return next();
                    }
                    req.sellerProfileChanged = true;
                    console.log("Profil sellera uspješno uređen!");

                    next();
                });
        }
        else next();
    },
    changeArticle: function (req, res, next) {
        pool.query(`update articles
                    set article_name = $1, description = $2, quantity = $3, unit_price = $4
                    where id = $5;`,
            [req.body.article_name, req.body.description, req.body.quantity, req.body.unit_price, req.body.id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKL NIJE UREĐEN");
                    return next();
                }
                req.articleChanged = true;
                console.log("Artikl uspješno uređen!");

                next();
            });
    },
    deleteAllArticleCategories: function (req, res, next) {
        pool.query(`delete from articles_categories
                    where articles_id = $1;`,
            [req.body.id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE ZA ARTIKL NISU OBRISANE");
                    return next();
                }
                console.log("Sve kategorije za artikl uspješno obrisane!");

                next();
            });
    },
    addArticleCategoriesSellerChanged: function (req, res, next) {
        var nizIDovaKategorija = JSON.parse(req.body.check);
        console.log("Kategorije artikla: " + nizIDovaKategorija);

        pool.query(`call dodaj_u_articles_categories($1, $2);`,
            [req.body.id, nizIDovaKategorija],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE ZA ARTIKL NISU DODATE");
                    return next();
                }
                console.log("Kategorije za artikl uspješno dodate!");

                next();
            });
    },
    getBuyerId: function (req, res, next) {
        pool.query(`select b.id from buyer b
                    inner join users u on b.users_id = u.id
                    where u.username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID BUYERA NIJE DOBIJEN");
                    return next();
                }
                req.buyerId = result.rows[0].id;
                console.log("ID buyera uspješno dobijen!");

                next();
            });
    },
    changeProfilePicture: function (req, res, next) {
        let putanjaProfilne = "/images/" + req.file.originalname;
        pool.query(`update buyer
                    set profile_picture = $1
                    where id = $2;`,
            [putanjaProfilne, req.buyerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PROFILNA BUYERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Profilna buyera uspješno promijenjena!");

                next();
            });
    },
    changeBackgroundPicture: function (req, res, next) {
        let putanjaProfilne = "/images/" + req.file.originalname;
        pool.query(`update buyer
                    set background_picture = $1
                    where id = $2;`,
            [putanjaProfilne, req.buyerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("POZADINA BUYERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Pozadina buyera uspješno promijenjena!");

                next();
            });
    },
    changeBuyerPassword: function (req, res, next) {
        let cryptedPassword = JSON.stringify(SHA256(req.body.password).words);
        pool.query(`update users
                    set password = $1
                    where username = $2;`,
            [cryptedPassword, req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ŠIFRA BUYERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Šifra buyera promijenjena!");
                req.buyerPasswordChanged = true;

                next();
            });
    },
    popularArticles: function (req, res, next) {
        pool.query(`select a.*, sum(od.quantity) as brojNarucenih, avg(ocjena) prosjecnaOcjena, daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    inner join order_details od on a.id = od.articles_id
                    inner join orders o on o.id = od.orders_id
                    inner join reviews_articles ra on a.id = ra.articles_id
                    where a.removed is null and u.status is null and o.status = 'Delivered'
                    group by a.id, s.id, s.company_name
                    order by brojNarucenih desc, prosjecnaOcjena desc
                    limit 4;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("POPULARNI ARTIKLI NISU DOBIJENI");
                    return next();
                }
                req.popularArticles = result.rows;
                console.log("Popularni artikli uspješno dobijeni!");

                next();
            });
    },
    randomArticles: function (req, res, next) {
        pool.query(`select a.*, daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    where a.removed is null and u.status is null
                    order by random()
                    limit 4;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("SLUČAJNI ARTIKLI NISU DOBIJENI");
                    return next();
                }
                req.randomArticles = result.rows;
                console.log("Slučajni artikli uspješno dobijeni!");

                next();
            });
    },
    getBuyerInterests: function (req, res, next) {
        pool.query(`select daj_sve_interese_kupca($1) as interesi;`,
            [req.buyerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("INTERESI KUPCA NISU DOBIJENI");
                    return next();
                }
                req.buyerInterests = result.rows[0].interesi;
                console.log("Interesi kupca uspješno dobijeni!");

                next();
            });
    },
    recommendedArticles: function (req, res, next) {
        pool.query(`select a.*, (select daj_sve_kategorije_artikla_2(a.id)) as kategorijepomocne, 
                    daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    where a.removed is null and u.status is null;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("SLUČAJNI ARTIKLI NISU DOBIJENI");
                    return next();
                }
                req.articles = result.rows;

                let niz = [];
                let dodani = [];

                for(let j=0; j<req.articles.length; j++){
                    dodani.push(false);
                    if (req.articles[j].kategorijepomocne !== null) {
                        for (let k=0; k<req.articles[j].kategorijepomocne.length; k++) {
                            let dodanArtikl = false;
                            if (req.buyerInterests !== null) {
                                for (let i = 0; i < req.buyerInterests.length; i++) {
                                    if (req.articles[j].kategorijepomocne[k] === req.buyerInterests[i]) {
                                        niz.push(req.articles[j]);
                                        dodanArtikl = true;
                                        break;
                                    }
                                }
                            }
                            if (dodanArtikl){
                                dodani[j] = true;
                                break;
                            }
                        }
                    }
                    if(niz.length === 4) break;
                }

                for(let j=niz.length; j<4; j++){
                    if(!dodani[j]){
                        niz.push(req.articles[j]);
                    }
                }

                req.recommendedArticles = niz;
                console.log("Slučajni artikli uspješno dobijeni!");

                next();
            });
    },
    removeArticle: function (req, res, next) {
        pool.query(`update articles
                    set removed = 'da'
                    where id = $1;`,
            [req.body.id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKL NIJE UKLONJEN");
                    return next();
                }
                req.articleRemoved = true;
                console.log("Artikl uspješno uklonjen!");

                next();
            });
    },
    deleteBuyerInterests: function (req, res, next) {
        let interesi = JSON.parse(req.body.za_obrisati);
        pool.query(`call izbrisi_iz_buyer_categories($1, $2);`,
            [req.buyerId, interesi],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("INTERESI KUPCA NISU OBRISANI");
                    return next();
                }
                req.interestsRemoved = true;
                console.log("Interesi kupca su uspješno obrisani!");

                next();
            });
    },
    addBuyerInterests: function (req, res, next) {
        let interesi = JSON.parse(req.body.za_dodati);
        pool.query(`call dodaj_u_buyer_categories($1, $2);`,
            [req.buyerId, interesi],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("INTERESI KUPCA NISU DODATI");
                    return next();
                }
                req.interestsAdded = true;
                console.log("Interesi kupca su uspješno dodati!");

                next();
            });
    },
    deleteFromSellerCategories: function (req, res, next) {
        let kategorije = JSON.parse(req.body.za_obrisati);
        pool.query(`call izbrisi_iz_seller_categories3($1);`,
            [kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE NISU OBRISANE IZ SELLER_CATEGORIES");
                    return next();
                }
                req.deletedFromSellerCategories = true;
                console.log("Kategorije uspješno obrisane iz seller_categories!");

                next();
            });
    },
    deleteFromBuyerCategories: function (req, res, next) {
        let kategorije = JSON.parse(req.body.za_obrisati);
        pool.query(`call izbrisi_iz_buyer_categories3($1);`,
            [kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE NISU OBRISANE IZ BUYER_CATEGORIES");
                    return next();
                }
                req.deletedFromBuyerCategories = true;
                console.log("Kategorije uspješno obrisane iz buyer_categories!");

                next();
            });
    },
    deleteFromArticlesCategories: function (req, res, next) {
        let kategorije = JSON.parse(req.body.za_obrisati);
        pool.query(`call izbrisi_iz_articles_categories3($1);`,
            [kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE NISU OBRISANE IZ ARTICLES_CATEGORIES");
                    return next();
                }
                req.deletedFromArticlesCategories = true;
                console.log("Kategorije uspješno obrisane iz articles_categories!");

                next();
            });
    },
    deleteFromCategories: function (req, res, next) {
        let kategorije = JSON.parse(req.body.za_obrisati);
        pool.query(`call izbrisi_iz_categories3($1);`,
            [kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE NISU OBRISANE IZ CATEGORIES");
                    return next();
                }
                req.deletedFromCategories = true;
                console.log("Kategorije uspješno obrisane iz categories!");

                next();
            });
    },
    addCategories: function (req, res, next) {
        let kategorije = JSON.parse(req.body.za_dodati);
        pool.query(`call dodaj_u_categories($1);`,
            [kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KATEGORIJE NISU DODATE U CATEGORIES");
                    return next();
                }
                req.categoriesAdded = true;
                console.log("Kategorije uspješno dodate u categories!");

                next();
            });
    },
    getAllSellersByName: function (req, res, next) {
        let naziv = "%" + req.params.naziv + "%";
        pool.query(`select u.username, s.id, s.company_name, s.telephone_number, s.email, s.headquarters_street_name, 
                    s.headquarters_city, s.profile_picture from users u 
                    inner join seller s on s.users_id = u.id
                    where u.status is null and (lower(s.company_name) like lower($1));`,
            [naziv],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆIM SELLERIMA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.sellers = result.rows;
                console.log("Podaci o odgovarajućim sellerima uspješno dobijeni!");

                next();
            });
    },
    getAllArticlesByName: function (req, res, next) {
        let naziv = "%" + req.params.naziv + "%";
        pool.query(`select a.*, daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    where a.removed is null and u.status is null and (lower(a.article_name) like lower($1));`,
            [naziv],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆIM ARTIKLIMA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.articles = result.rows;
                console.log("Podaci o odgovarajućim artiklima uspješno dobijeni!");

                next();
            });
    },
    getAllBuyersByName: function (req, res, next) {
        let naziv = "%" + req.params.naziv + "%";
        pool.query(`select u.username, b.first_name, b.last_name, b.profile_picture from buyer b
                    inner join users u on b.users_id = u.id
                    where u.status is null and (lower(first_name) like lower($1) or lower(last_name) like lower($1))
                    and u.username != $2;`,
            [naziv, req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆIM BUYERIMA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.buyers = result.rows;
                console.log("Podaci o odgovarajućim buyerima uspješno dobijeni!");

                next();
            });
    },
    getBuyerByUsername:  function (req, res, next) {
        let username = req.params.username;
        console.log(username);
        pool.query(`select u.username, u.status, b.first_name, b.last_name, b.email, b.profile_picture, b.background_picture from buyer b
                    inner join users u on u.id = b.users_id
                    where u.username = $1;`,
            [username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆEM BUYERU NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0){
                    console.log("Nema takvog usernamea!");
                    return next();
                }
                req.buyerInfo = result.rows[0];
                console.log("Podaci o odgovarajućem buyeru uspješno dobijeni!");

                next();
            });
    },
    getArticleById: function (req, res, next) {
        let id_artikla = req.params.id_artikla;
        pool.query(`select a.*, daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    where u.status is null and a.id = $1;`,
            [id_artikla],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O TRAŽENOM ARTIKLU NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.article = result.rows[0];
                console.log("Podaci o traženom artiklu uspješno dobijeni!");

                next();
            });
    },
    changeArticlePicture: function (req, res, next) {
        let putanjaProfilne = "/images/artikli/" + req.file.originalname;
        if(req.params.id_artikla){
            req.articleId = req.params.id_artikla;
        }
        pool.query(`update articles
                    set picture = $1
                    where id = $2;`,
            [putanjaProfilne, req.articleId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("SLIKA ARTIKLA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Slika artikla uspješno promijenjena!");

                next();
            });
    },
    getSellerById: function (req, res, next) {
        let id_prodavaca = req.params.id_prodavaca;
        pool.query(`select s.*, u.username from seller s
                    inner join users u on u.id = s.users_id
                    where u.status is null and s.id = $1;`,
            [id_prodavaca],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O TRAŽENOM SELLERU NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.sellerInfo = result.rows[0];
                console.log("Podaci o traženom selleru uspješno dobijeni!");

                next();
            });
    },
    processOrder: function (req, res, next) {
        let narudzba = jwt.verify(req.cookies.narudzba, 'narudzba').narudzba;
        if(narudzba.length == 0) next();
        let buyer_id = parseInt(req.buyerId);
        let selleri = [];//niz
        let artikli = [];//matrica
        let kolicine = [];//matrica
        for(let i=0; i<narudzba.length; i++){
            selleri.push(narudzba[i].seller_id);
            artikli.push(narudzba[i].nizArtikala);
            kolicine.push(narudzba[i].kolicine);
        }
        let artikli2 = []; //niz
        let kolicine2 = []; //niz
        for(let i=0; i<artikli.length; i++){
            for(let j=0; j<artikli[i].length; j++){
                artikli2.push(artikli[i][j]);
                kolicine2.push(kolicine[i][j]);
            }
            artikli2.push('-');
            kolicine2.push('-');
        }
        pool.query(`call dodaj_orders_i_order_details($1, $2, $3, $4);`,
            [buyer_id, selleri, artikli2, kolicine2],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ORDER NIJE USPJEŠAN");
                    return next();
                }
                console.log("Order je uspješan!");

                next();
            });
    },
    notifySellersViaEmail: function (req, res, next) {
        let narudzba = jwt.verify(req.cookies.narudzba, 'narudzba').narudzba;
        console.log(narudzba.length);
        if(narudzba.length == 0) next();
        let selleri = [];//niz
        for(let i=0; i<narudzba.length; i++){
            selleri.push(narudzba[i].seller_id);
        }
        console.log(selleri);
        pool.query(`select email from seller where id = any($1::int[]);`,
            [selleri],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("MEJLOVI SELLERA NISU DOBIJENI");
                    return next();
                }
                console.log("Mejlovi sellera uspješno dobijeni!");
                let mejlovi = result.rows;

                console.log(mejlovi);

                let spisak_mejlova = '';
                for(let i=0; i<mejlovi.length-1; i++){
                    spisak_mejlova += mejlovi[i].email + ',';
                }
                if(mejlovi.length > 0){
                    spisak_mejlova += mejlovi[mejlovi.length-1].email;
                }

                console.log(spisak_mejlova);

                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'webshop.smajic.edin.7@gmail.com',
                        pass: 'Kakanjgrad_7'
                    }
                });

                let mailOptions = {
                    from: 'webshop.smajic.edin.7@gmail.com',
                    to: spisak_mejlova,
                    subject: 'Dobili ste novu narudžbu',
                    html: '<p>Upravo je kreirana nova narudžba sa vašim artiklima! Saznajte više na: <a href="http://localhost:3000/prodavac/narudzbe">localhost:3000/prodavac/narudzbe</a></p>'
                };

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Emailovi poslani: ' + info.response);
                    }
                });

                res.clearCookie('narudzba');
                let narudzba = jwt.sign({ narudzba: [] }, 'narudzba');
                console.log("Kriptovana narudzba: " + narudzba);
                res.cookie('narudzba', narudzba);

                next();
            });
    },
    getAllArticlesFromOrder: function (req, res, next) {

        let narudzba = jwt.verify(req.cookies.narudzba, 'narudzba').narudzba;
        let idovi_artikala = [];
        let kolicine = [];

        for(let i=0; i<narudzba.length; i++){
            for(let j=0; j<narudzba[i].nizArtikala.length; j++){
                idovi_artikala.push(narudzba[i].nizArtikala[j]);
                kolicine.push(narudzba[i].kolicine[j]);
            }
        }

        pool.query(`select a.* from articles a
                    inner join seller s on s.id = a.seller_id
                    where a.id = any($1::int[])
                    order by a.id;`, // svakako nisu uklonjeni ti artikli
            [idovi_artikala],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O TRAŽENIM ARTIKLIMA NISU DOBIJENI");
                    return next();
                }
                req.artikli = result.rows;
                req.idovi_artikala = idovi_artikala;
                req.kolicine = kolicine;
                console.log("Podaci o traženim artiklima uspješno dobijeni!");

                next();
            });
    },
    getOrders: function (req, res, next) {
        pool.query(`select o.*, od.articles_id, od.quantity, od.price, a.article_name, a.picture, a.unit_price from orders o
                    inner join order_details od on od.orders_id = o.id
                    inner join articles a on a.id = od.articles_id
                    where o.buyer_id = $1
                    order by o.id;`,
            [parseInt(req.buyerId)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ORDERSIMA BUYERA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length !== 0){
                    req.orders = result.rows;
                    //console.log(req.orders);
                }
                else req.orders = [];

                console.log("Podaci o ordersima buyera uspješno dobijeni!");

                next();
            });
    },
    cancelOrder: function (req, res, next) {
        let id_narudzbe = parseInt(req.params.id_narudzbe);
        pool.query(`update orders
                    set status = 'Cancelled'
                    where id = $1;`,
            [id_narudzbe],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ORDER NIJE CANCELLOVAN");
                    return next();
                }
                console.log("Order uspješno cancellovan!");
                req.status = 'Cancelled';

                next();
            });
    },
    getNewOrdersForSeller: function (req, res, next) {
            pool.query(`select o.*, od.articles_id, od.quantity, od.price, a.article_name, a.picture, a.unit_price from orders o
                        inner join order_details od on od.orders_id = o.id
                        inner join articles a on a.id = od.articles_id
                        where o.seller_id = $1 and o.status is null
                        order by o.id;`,
            [parseInt(req.sellerId)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O NOVIM ORDERSIMA SELLERA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length !== 0){
                    req.orders = result.rows;
                    //console.log(req.orders);
                }
                else req.orders = [];

                console.log("Podaci o novim ordersima sellera uspješno dobijeni!");

                next();
            });
    },
    getProcessedOrders: function (req, res, next) {
        pool.query(`select o.*, od.articles_id, od.quantity, od.price, a.article_name, a.picture, a.unit_price from orders o
                    inner join order_details od on od.orders_id = o.id
                    inner join articles a on a.id = od.articles_id
                    where o.seller_id = $1 and o.status is not null and o.status != 'Accepted'
                    order by o.id;`,
            [parseInt(req.sellerId)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O OBRAĐENIM ORDERSIMA SELLERA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length !== 0){
                    req.processedOrders = result.rows;
                    //console.log(req.processedOrders);
                }
                else req.processedOrders = [];

                console.log("Podaci o obrađenim ordersima sellera uspješno dobijeni!");

                next();
            });
    },
    getUndeliveredOrders: function (req, res, next) {
        pool.query(`select o.*, od.articles_id, od.quantity, od.price, a.article_name, a.picture, a.unit_price from orders o
                    inner join order_details od on od.orders_id = o.id
                    inner join articles a on a.id = od.articles_id
                    where o.seller_id = $1 and o.status = 'Accepted'
                    order by o.id;`,
            [parseInt(req.sellerId)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O NEDOSTAVLJENIM ORDERSIMA SELLERA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length !== 0){
                    req.undeliveredOrders = result.rows;
                    //console.log(req.undeliveredOrders);
                }
                else req.undeliveredOrders = [];

                console.log("Podaci o nedostavljenim ordersima sellera uspješno dobijeni!");

                next();
            });
    },
    acceptOrder: function (req, res, next) {
        let id_narudzbe = parseInt(req.params.id_narudzbe);
        pool.query(`update orders
                    set status = 'Accepted'
                    where id = $1;`,
            [id_narudzbe],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ORDER NIJE PRIHVAĆEN");
                    return next();
                }
                console.log("Order uspješno prihvaćen!");
                req.status = 'Accepted';

                next();
            });
    },
    rejectOrder: function (req, res, next) {
        let id_narudzbe = parseInt(req.params.id_narudzbe);
        pool.query(`update orders
                    set status = 'Rejected'
                    where id = $1;`,
            [id_narudzbe],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ORDER NIJE ODBIJEN");
                    return next();
                }
                console.log("Order uspješno odbijen!");
                req.status = 'Rejected';

                next();
            });
    },
    deliverOrder: function (req, res, next) {
        let id_narudzbe = parseInt(req.params.id_narudzbe);
        pool.query(`update orders
                    set status = 'Delivered'
                    where id = $1;`,
            [id_narudzbe],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ORDER NIJE STAVLJEN DA JE DOSTAVLJEN");
                    return next();
                }
                console.log("Order uspješno stavljen da je dostavljen!");
                req.status = 'Delivered';

                pool.query(`call promijeni_kolicine_artikala($1);`,
                    [id_narudzbe],
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            console.log("KOLIČINE ARTIKALA NISU PROMIJENJENE");
                            return next();
                        }
                        console.log("Količine artikala uspješno promijenjene!");
                        req.status = 'Delivered';

                        next();
                    });
            });
    },
    getTotalProfit: function (req, res, next) {
        pool.query(`select sum(od.price) total_profit from orders o
                    inner join order_details od on od.orders_id = o.id
                    where o.seller_id = $1 and o.status = 'Delivered'
                    group by o.seller_id;`,
            [req.sellerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("UKUPAN PROFIT SELLERA NIJE DOBIJEN");
                    return next();
                }
                if(result.rows.length === 0) req.profit = 0;
                else req.profit = result.rows[0].total_profit;
                console.log("Ukupan profit sellera uspješno dobijen!");

                next();
            });
    },
    getTotalMoneySpent: function (req, res, next) {
        pool.query(`select sum(od.price) total_spent from orders o
                    inner join order_details od on od.orders_id = o.id
                    where o.buyer_id = $1 and o.status = 'Delivered'
                    group by o.buyer_id;`,
            [req.buyerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("UKUPAN ULOG BUYERA NIJE DOBIJEN");
                    return next();
                }
                if(result.rows.length === 0) req.total_spent = 0;
                else req.total_spent = result.rows[0].total_spent;
                console.log("Ukupan ulog buyera uspješno dobijen!");

                next();
            });
    },
    notifyBuyerViaEmail: function (req, res, next) {
        pool.query(`select email from buyer where id = $1;`,
            [req.buyerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("MEJL BUYERA NIJE DOBIJEN");
                    return next();
                }
                console.log("Mejl buyera uspješno dobijen!");
                let mejlKupca = result.rows[0].email;

                console.log(mejlKupca);

                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'webshop.smajic.edin.7@gmail.com',
                        pass: 'Kakanjgrad_7'
                    }
                });

                let mailOptions = {
                    from: 'webshop.smajic.edin.7@gmail.com',
                    to: mejlKupca,
                    subject: 'Nova narudžba',
                    text: `Vaša nova narudžba je uspješno kreirana i poslata prodavaču/ima na obradu.`
                };

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email poslan: ' + info.response);
                    }
                });

                next();
            });
    },
    notifyBuyerViaEmailStatusChanged: function (req, res, next) {
        let id_narudzbe = parseInt(req.params.id_narudzbe);
        pool.query(`select b.email from orders o
                    inner join buyer b on b.id = o.buyer_id
                    where o.id = $1;`,
            [id_narudzbe],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("EMAIL BUYERA ZA NARUDZBU NIJE DOBIJEN");
                    return next();
                }
                req.buyerEmailFromOrder = result.rows[0].email;
                console.log("Email buyera za narudzbu uspješno dobijen!");

                let tekst;
                let mejlKupca = req.buyerEmailFromOrder;
                let status = req.status;

                if(status === 'Accepted'){
                    tekst = `Prodavač je prihvatio vašu narudžbu.`;
                }
                else if(status === 'Rejected'){
                    tekst = `Prodavač je odbio vašu narudžbu.`;
                }
                else if(status === 'Delivered'){
                    tekst = `Narudžba vam je uspješno isporučena.`;
                }
                else if(status === 'Cancelled'){
                    tekst = `Narudžbu ste uspješno otkazali.`;
                }

                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'webshop.smajic.edin.7@gmail.com',
                        pass: 'Kakanjgrad_7'
                    }
                });

                let mailOptions = {
                    from: 'webshop.smajic.edin.7@gmail.com',
                    to: mejlKupca,
                    subject: 'Promjena statusa narudžbe',
                    text: tekst
                };

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email poslan: ' + info.response);
                    }
                });

                next();
            });
    },
    updateSellerProfilePic: function (req, res, next) {
        let putanjaProfilne = "/images/trgovci/" + req.file.originalname;
        pool.query(`update seller
                    set profile_picture = $1
                    where id = $2;`,
            [putanjaProfilne, req.sellerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PROFILNA SELLERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Profilna sellera uspješno promijenjena!");

                next();
            });
    },
    getCommentsForSeller: function (req, res, next) {
        let id_prodavaca;
        if(req.sellerId) id_prodavaca = req.sellerId;
        else id_prodavaca = parseInt(req.params.id_prodavaca);
        pool.query(`select cs.id, cs.text, b.first_name, b.last_name, b.profile_picture, u.username from comments_seller cs
                    inner join buyer b on cs.buyer_id = b.id
                    inner join users u on u.id = b.users_id
                    where cs.seller_id = $1;`,
            [id_prodavaca],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KOMENTARI ZA SELLERA NISU DOBIJENI");
                    return next();
                }
                console.log("Komentari za sellera uspješno dobijeni!");
                req.comments = result.rows;

                next();
            });
    },
    addComment: function (req, res, next) {
        pool.query(`insert into comments_seller(buyer_id, seller_id, text)
                    values($1, $2, $3);`,
            [req.buyerId, req.body.seller_id, req.body.text],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("KOMENTAR NIJE DODAT");
                    return next();
                }
                console.log("Komentar uspješno dodat!");

                next();
            });
    },
    rateSeller: function (req, res, next) {
        pool.query(`select id from reviews_seller
                    where buyer_id = $1 and seller_id = $2;`,
            [req.buyerId, req.body.seller_id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID OCJENE NIJE DOBIJEN");
                    return next();
                }
                console.log("ID OCJENE DOBIJEN (AKO POSTOJI)!");
                if(result.rows.length !== 0) {
                    let idOcjene = result.rows[0].id;
                    pool.query(`update reviews_seller
                                set ocjena = $1
                                where id = $2;`,
                        [req.body.ocjena, idOcjene],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                console.log("OCJENA NIJE MODIFIKOVANA");
                                return next();
                            }
                            console.log("Ocjena uspješno modifikovana!");

                            next();
                        });
                }
                else {
                    pool.query(`insert into reviews_seller(buyer_id, seller_id, ocjena)
                                values($1, $2, $3);`,
                        [req.buyerId, req.body.seller_id, req.body.ocjena],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                console.log("OCJENA NIJE DODATA");
                                return next();
                            }
                            console.log("Ocjena uspješno dodata!");

                            next();
                        });
                }
            });
    },
    getSellerRating: function(req, res, next){
        let seller_id;
        if(req.params.id_prodavaca) seller_id = req.params.id_prodavaca;
        else seller_id = req.sellerId;
        pool.query(`select avg(ocjena) pocjena from reviews_seller
                    where seller_id = $1;`,
            [seller_id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("OCJENA SELLERA NIJE DOBIJENA");
                    return next();
                }
                console.log("Ocjena sellera uspješno dobijena!");
                if(result.rows.length !== 0) req.ocjena = Math.ceil(result.rows[0].pocjena);
                else req.ocjena = 0;

                next();
            });
    },
    rateArticle: function (req, res, next) {
        pool.query(`select id from reviews_articles
                    where buyer_id = $1 and articles_id = $2;`,
            [req.buyerId, req.body.artikl_id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID OCJENE ARTIKLA NIJE DOBIJEN");
                    return next();
                }
                console.log("ID OCJENE ARTIKLA DOBIJEN (AKO POSTOJI)!");
                if(result.rows.length !== 0) {
                    let idOcjene = result.rows[0].id;
                    pool.query(`update reviews_articles
                                set ocjena = $1
                                where id = $2;`,
                        [req.body.ocjena, idOcjene],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                console.log("OCJENA NIJE MODIFIKOVANA");
                                return next();
                            }
                            console.log("Ocjena uspješno modifikovana!");

                            next();
                        });
                }
                else {
                    pool.query(`insert into reviews_articles(buyer_id, articles_id, ocjena)
                                values($1, $2, $3);`,
                        [req.buyerId, req.body.artikl_id, req.body.ocjena],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                console.log("OCJENA NIJE DODATA");
                                return next();
                            }
                            console.log("Ocjena uspješno dodata!");

                            next();
                        });
                }
            });
    },
    getArticleRating: function(req, res, next){
        let article_id;
        if(req.params.id_artikla) article_id = req.params.id_artikla;
        pool.query(`select avg(ocjena) pocjena from reviews_articles
                    where articles_id = $1;`,
            [article_id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("OCJENA ARTIKLA NIJE DOBIJENA");
                    return next();
                }
                console.log("Ocjena artikla uspješno dobijena!");
                if(result.rows.length !== 0) req.ocjena = Math.ceil(result.rows[0].pocjena);
                else req.ocjena = 0;

                next();
            });
    },
    updateSellerBackgroundPic: function (req, res, next) {
        let putanjaPozadine = "/images/trgovci/" + req.file.originalname;
        pool.query(`update seller
                    set background_picture = $1
                    where id = $2;`,
            [putanjaPozadine, req.sellerId],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("POZADINA SELLERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Pozadina sellera uspješno promijenjena!");

                next();
            });
    },

    changeSellerPassword: function (req, res, next) {
        let cryptedPassword = JSON.stringify(SHA256(req.body.password).words);
        pool.query(`update users
                    set password = $1
                    where username = $2;`,
            [cryptedPassword, req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ŠIFRA SELLERA NIJE PROMIJENJENA");
                    return next();
                }
                console.log("Šifra selleraa promijenjena!");
                req.sellerPasswordChanged = true;

                next();
            });
    },
    getRatingByBuyer: function(req, res, next){
        let buyer_id = req.buyerId;
        pool.query(`select ocjena from reviews_seller
                    where buyer_id = $1 and seller_id = $2;`,
            [buyer_id, req.params.id_prodavaca],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("OCJENA ZA SELLERA NIJE DOBIJENA");
                    return next();
                }
                console.log("Ocjena sellera uspješno dobijena!");
                if(result.rows.length === 0) req.ocjena2 = 0;
                else req.ocjena2 = result.rows[0].ocjena;

                next();
            });
    },
    getRatingByBuyerForArticle: function(req, res, next){
        let buyer_id = req.buyerId;
        pool.query(`select ocjena from reviews_articles
                    where buyer_id = $1 and articles_id = $2;`,
            [buyer_id, req.params.id_artikla],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("OCJENA ZA ARTIKL NIJE DOBIJENA");
                    return next();
                }
                console.log("Ocjena artikl uspješno dobijena!");
                if(result.rows.length === 0) req.ocjena2 = 0;
                else req.ocjena2 = result.rows[0].ocjena;

                next();
            });
    },
    getAllSellersByCategory: function (req, res, next) {
        let id_kategorije = parseInt(req.params.id_kategorije);
        pool.query(`select u.username, s.id, s.company_name, s.telephone_number, s.email, s.headquarters_street_name,
                    s.headquarters_city, s.profile_picture from users u
                    inner join seller s on s.users_id = u.id
                    inner join seller_categories sc on s.id = sc.seller_id
                    where u.status is null and sc.categories_id = $1;`,
            [id_kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆIM SELLERIMA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.sellers = result.rows;
                console.log("Podaci o odgovarajućim sellerima uspješno dobijeni!");

                next();
            });
    },
    getAllArticlesByCategory: function (req, res, next) {
        let id_kategorije = parseInt(req.params.id_kategorije);
        pool.query(`select a.*, daj_sve_kategorije_artikla(a.id) as kategorije, s.id as sellerID, s.company_name from articles a
                    inner join seller s on a.seller_id = s.id
                    inner join users u on u.id = s.users_id
                    inner join articles_categories ac on a.id = ac.articles_id
                    where a.removed is null and u.status is null and ac.categories_id = $1;`,
            [id_kategorije],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PODACI O ODGOVARAJUĆIM ARTIKLIMA NISU DOBIJENI");
                    return next();
                }
                if(result.rows.length === 0) return next();
                req.articles = result.rows;
                console.log("Podaci o odgovarajućim artiklima uspješno dobijeni!");

                next();
            });
    },
    getArticlesForSellerByCategory: function (req, res, next) {
        pool.query(`select a.* from articles a
                    inner join seller s on s.id = a.seller_id
                    inner join articles_categories ac on ac.articles_id = a.id
                    where a.removed is null and s.id = $1 and ac.categories_id = $2;`,
            [parseInt(req.body.seller_id), parseInt(req.body.id_kategorije)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKLI ZA SELLERA PO KATEGORIJI NISU DOBIJENI");
                    return next();
                }
                req.artikliS = result.rows;
                console.log("Svi artikli za Sellera po kategoriji uspješno dobijeni!");

                next();
            });
    },
    sellerBuyerRatio: function(req, res, next){
        pool.query(`select type, count(*) broj from users
                    where type = 1 or type = 2
                    group by type;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("OMJER PRODAVAČA I KUPACA NIJE DOBIJEN");
                    return next();
                }
                req.ratio = result.rows;
                console.log("Uspješno dobijen omjer prodavača i kupaca!");

                next();
            });
    },
    statusRatio: function(req, res, next){
        pool.query(`select status, count(*) broj from users
                    where type = 1 or type = 2
                    group by status
                    order by status desc;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("STATUS SVEGA NIJE DOBIJEN");
                    return next();
                }
                req.status = result.rows;
                console.log("Uspješno dobijen status svega!");

                next();
            });
    },
    articleCategories: function(req, res, next){
        pool.query(`select c.id, c.category_name, count(*) broj from articles_categories ac
                    inner join categories c on c.id = ac.categories_id
                    group by c.id, c.category_name
                    order by broj desc, c.category_name
                    limit 7;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ARTIKLI PO KATEGORIJAMA NISU DOBIJENI");
                    return next();
                }
                req.artCat = result.rows;
                console.log("Artikli po kategorijama uspješno dobijeni!");

                next();
            });
    },
    popularArticles2: function(req, res, next){
        pool.query(`select a.id, a.article_name, count(*) broj from articles a
                    inner join order_details od on a.id = od.articles_id
                    group by a.id
                    order by broj desc
                    limit 10;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("NAJPOPULARNIJI ARTIKLI NISU DOBIJENI");
                    return next();
                }
                req.popArt = result.rows;
                console.log("Najpopularniji artikli uspješno dobijeni!");

                next();
            });
    },
    ordersStatus: function(req, res, next){
        pool.query(`select status, count(*) broj from orders
                    group by status
                    order by status;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("STATUSI ORDERSA NISU DOBIJENI");
                    return next();
                }
                req.ordStatus = result.rows;
                for(let i=0; i<req.ordStatus.length; i++) {
                    if(req.ordStatus[i].status === 'Delivered') {
                        req.ordStatus[i].status = 'Dostavljeno';
                    } else if(req.ordStatus[i].status === 'Rejected') {
                        req.ordStatus[i].status = 'Odbijeno';
                    } else if(req.ordStatus[i].status === 'Accepted') {
                        req.ordStatus[i].status = 'Prihvaćeno';
                    } else if(req.ordStatus[i].status === 'Cancelled') {
                        req.ordStatus[i].status = 'Otkazano';
                    } else{
                        req.ordStatus[i].status = 'Na čekanju';
                    }
                }
                console.log("Statusi ordersa uspješno dobijeni!");
                console.log(req.ordStatus);

                next();
            });
    },
    getBuyersForMessages: function(req, res, next){
        pool.query(`select * from users u
                    inner join buyer b on u.id = b.users_id
                    where u.status is null;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("BUYERI NISU DOBIJENI");
                    return next();
                }
                req.buyers = result.rows;
                console.log("Buyeri uspješno dobijeni!");

                next();
            });
    },
    getSellersForMessages: function(req, res, next){
        pool.query(`select * from users u
                    inner join seller s on u.id = s.users_id
                    where u.status is null;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("SELLERI NISU DOBIJENI");
                    return next();
                }
                req.sellers = result.rows;
                console.log("Selleri uspješno dobijeni!");

                next();
            });
    },
    getAdminsForMessages: function(req, res, next){
        pool.query(`select * from users
                    where type = 0;`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ADMINI NISU DOBIJENI");
                    return next();
                }
                req.admins = result.rows;
                console.log("Admini uspješno dobijeni!");

                next();
            });
    },
    getUserInfo: function(req, res, next){
        pool.query(`select * from users
                    where username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("INFORMACIJE O USERU NISU DOBIJENE");
                    return next();
                }
                req.korisnik = result.rows[0];
                console.log("Informacije o useru uspješno dobijene!");

                next();
            });
    },
    saveMessageIntoDB: function(d, req, res){
        pool.query(`insert into messages(sender_user_id, reciever_user_id, text) values
                    ($1, $2, $3);`,
            [d.usSID, d.usRID, d.tekst],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PORUKA NIJE SAČUVANA");
                    return;
                }
                console.log("Poruka je uspješno sačuvana!");

            });
    },
    getUserId: function(req, res, next){
        pool.query(`select id from users
                    where username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("ID USERA NIJE DOBIJEN");
                    return next();
                }
                console.log("ID usera uspješno dobijen!");
                req.userID = result.rows[0].id;

                next();
            });
    },
    getAllMessagesForUserAndReciever: function(req, res, next){
        pool.query(`select u.username as primalac, u2.username as posiljalac, m.text, m.time_sent from messages m
                    inner join users u on m.reciever_user_id = u.id
                    inner join users u2 on m.sender_user_id = u2.id
                    where (u.id = $1 and u2.id = $2) or (u2.id = $1 and u.id = $2)
                    order by time_sent;`,
            [req.userID, parseInt(req.params.primalac)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("PORUKE TA DVA USERA NISU DOBIJENE");
                    return next();
                }
                console.log("Poruke ta dva usera uspješno dobijene!");
                req.messages = result.rows;

                next();
            });
    },
    getCategoryName: function(req, res, next){
        pool.query(`select category_name from categories
                    where id = $1;`,
            [parseInt(req.params.id_kategorije)],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("IME KATEGORIJE NIJE DOBIJENO");
                    return next();
                }
                console.log("Ime kategorije uspješno dobijeno!");
                req.naziv = result.rows[0].category_name;

                next();
            });
    },
    getUserType: function(req, res, next){
        pool.query(`select type from users
                    where username = $1;`,
            [req.decodedToken.username],
            (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("TIP KORISNIKA NIJE DOBIJEN");
                    return next();
                }
                console.log("Tip korisnika uspješno dobijen!");
                req.type = result.rows[0].type;

                next();
            });
    },
}

module.exports = obj;