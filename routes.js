var express = require('express');
var path = require('path');
var router = express.Router();
var mongodb = require('./db');
var mongojs = require('mongojs');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var stripe = require("stripe")(""); // TODO add stripeToken
var nodemailer = require('nodemailer');
var striptags = require('striptags');
var csv = require('csv');

router.get('/health', secure, function(req, res){ res.send('1'); });

// get home page (THE Form)
router.get('/', secure, function (req, res) {
  mongodb.participants.find().toArray(function(err, part) {
    mongodb.participants.find({ 'contacts.dejaVenu': 'false' }).toArray(function(err, pasVenu) {
        var quota = (part.length - pasVenu.length) / part.length * 100;
        res.render('formulaire', { quota: quota, totalPart: part.length})
    });
  });
});
// verif email invitant
router.get('/verifMail/:email',
    secure,
    function(req, res){
      // list of mail of orgas
      var array = ['wyss.luca@gmail.com']; // TODO add list of organizers emails
      if (array.indexOf(req.params.email) === -1) {
        var verif = false;
      } else {var verif = true;}
      res.send(verif);;
});

// post the form into db & stripe (payement check)
router.post('/payement',
    secure,
    function(req, res) {
      var FormulaireDB = require('./formulaireDB');
      var formPost = new FormulaireDB(req);
      var data = formPost.form();
      mongodb.participants.save(data, function(err,posted){
        var id = posted._id;
        var token = posted.payement.stripeToken;
        var charge = stripe.charges.create({
          amount: posted.payement.total * 100,
          currency: "eur",
          description: posted.contacts.prenom + ' ' + posted.contacts.nom + ' - picfestival2018',
          source: token,
          receipt_email: posted.contacts.mail,
        }, function(err, charge) {
          if (err) {
            console.log(err);
          } else {
            mongodb.participants.update({'_id': posted._id}, {$set: {'payement.confirmation': 'true'}});
          }
        });
        var transporter = nodemailer.createTransport({
            service: '', // add email service name
            auth: {
                user: '', // TODO add post server user
                pass: '' // TODO add post server pwd
            }
        });
        var message = '<!DOCTYPE html><html lang="en-US"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head><body><img src="https://inscription.picfestival.com/img/eclair.png" alt="eclair"><br><b>Salut ' + posted.contacts.prenom + ' et bienvenue, </b><p>tu es maintenant adhérent à l’asso <a href="http://picfestival.com">ASS 2 PIC</a> ! </p><p>Voici un petit rappel de tes dates à Pic. Tu viens du ' + posted.dates.arrivee + ' au ' + posted.dates.depart + ' (la semaine du 7 au 11 août 2018). Tu as participé aux frais à hauteur de ' + posted.payement.total + '€. </p><p>Pour tous les détails sur l’édition 2018 de PIC, va voir ta <a href="https://inscription.picfestival.com/confirmation/' + id + '">page d’info</a>.</p><p>Gros bisous et à cet été ! </p><p>Les orgas de l’amour</p><img src="https://inscription.picfestival.com/img/eclair.png" alt="eclair"></body></html>';
        var mailOptions = {
            from: '"PIC 2018 🎶" <bonjour@picfestival.com>',
            to: posted.contacts.mail,
            subject: "Confirmation de l'inscription à PIC 2018",
            text: striptags(message),
            html:  message
        };
        transporter.sendMail(mailOptions);
        res.redirect('/confirmation/' + id);
      });
});

// confirmation page & info (personnilized)
router.get('/confirmation/:id',
  secure,
  function(req, res){
    var objID = new mongojs.ObjectId(req.params.id);
    mongodb.participants.find({'_id': objID}).toArray(function(err, info) {
      res.render('confirmation', { prenom: info[0].contacts.prenom,
                                  arrivee: info[0].dates.arrivee,
                                  depart: info[0].dates.depart,
                                  prix: info[0].payement.total });
    });
  });

// passport routing (login page for admins)
router.get('/login',
  secure,
  function(req, res){
    res.render('login', { user: req.user });
  });
router.post('/login',
  secure,
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/admin');
  });
router.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/login');
  });

// tableau avec les infos
router.get('/admin/',
  secure,
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    var query = req.params.id;
    mongodb.participants.find().toArray(function(err, part) {
      var inscrits = part.length;
      var nbEnfantsTotal = 0;
      var prefSansPorc = 0;
      var prefSansGluten = 0;
      var prefSansViande = 0;
      var nbRepasTotal = 0;
      var payementTotal = 0;
      var payementForfait = 0;
      var payementRepas = 0;
      var caisseSolidarite = 0;
      for (var i = 0; i < part.length; i++) {
        if (part[i].contacts.enfants) { nbEnfantsTotal += parseFloat(part[i].contacts.nbEnfants); }
        if (part[i].dates.prefAlim.includes('Sans porc')) { prefSansPorc += parseFloat(part[i].dates.nbRepas); }
        if (part[i].dates.prefAlim.includes('Sans gluten')) { prefSansGluten += parseFloat(part[i].dates.nbRepas); }
        if (part[i].dates.prefAlim.includes('Végétarien')) { prefSansViande += parseFloat(part[i].dates.nbRepas); }
        nbRepasTotal += parseFloat(part[i].dates.nbRepas);
        payementForfait += part[i].payement.forfait;
        payementRepas += part[i].payement.repas;
        payementTotal += part[i].payement.total;
        caisseSolidarite += (part[i].payement.adhesions - 1);
      }
      res.render('admin', { inscrits : inscrits, nbEnfants : nbEnfantsTotal, prefSansPorc : prefSansPorc, prefSansGluten : prefSansGluten, prefSansViande : prefSansViande, nbRepas : nbRepasTotal, payement : payementTotal, payementForfait : payementForfait, payementRepas : payementRepas, caisse : caisseSolidarite});
    });
});
router.get('/tableau/:id',
    secure,
    require('connect-ensure-login').ensureLoggedIn(),
    function(req, res){
      var query, titre;
      switch(req.params.id) {
          case 'prog':
              query = { 'proposition.type': { $ne: 'false' } };
              titre = "Programmation (propositions des participants)";
              break;
          case 'acceuil':
              query = {};
              titre = "Acceuil (contacts & dates d'arrivée/départ)";
              break;
          case 'sante':
              query = { 'competences.medicale': 'true' };
              titre = "Santé (nos beaux infirmiers)";
              break;
          case 'bricolos':
              query = { $or: [ { 'competences.electricite': 'true' }, { 'competences.plomberie': 'true' }, { 'competences.restauration': 'true' }, { 'competences.techspectacle': 'true' }, { 'competences.travaux': 'true' } ] };
              titre = "Compétences (les bricolos)";
              break;
          default:
              query = {};
              titre = "Tout";
      }
      mongodb.participants.find().toArray(function(err, part) {
        var inscrits = part.length;
        mongodb.participants.find(query).toArray(function(err, tables) {
          res.render('tableau', { query: req.params.id, titre: titre, db: tables, inscrits: inscrits});
        });
      });
});

router.get('/csv/:id',
    secure,
    require('connect-ensure-login').ensureLoggedIn(),
    function(req, res){
      var query;
      switch(req.params.id) {
          case 'prog':
              query = { 'proposition.type': { $ne: 'false' } };
              break;
          case 'acceuil':
              query = {};
              break;
          case 'sante':
              query = { 'competences.medicale': 'true' };
              break;
          case 'bricolos':
              query = { $or: [ { 'competences.electricite': 'true' }, { 'competences.plomberie': 'true' }, { 'competences.restauration': 'true' }, { 'competences.techspectacle': 'true' }, { 'competences.travaux': 'true' } ] };
              break;
          default:
              query = {};
      }
      var cursor = mongodb.participants.find(query);
      var transformer = function(data){
        return {
            prenom: data.contacts.prenom,
            nom: data.contacts.nom,
            mail: data.contacts.mail,
            telephone: data.contacts.telephone,
            dejaVenu: data.contacts.dejaVenu,
            organisateur: data.contacts.organisateur,
            enfants: data.contacts.enfants,
            nbEnfants: data.contacts.nbEnfants,
            arrivee: data.dates.arrivee,
            depart: data.dates.depart,
            nbRepas: data.dates.nbRepas,
            prefAlim: data.dates.prefAlim,
            participation: data.payement.total,
            virement: data.payement.confirmation,
            demandeSolidarite: data.payement.solidarite,
            propositionType: data.proposition.type,
            propositionTitre: data.proposition.titre,
            propositionDescription: data.proposition.description,
            medicale: data.competences.medicale,
            electricite: data.competences.electricite,
            plomberie: data.competences.plomberie,
            restauration: data.competences.restauration,
            techspectacle: data.competences.techspectacle,
            travaux: data.competences.travaux,
            futs: data.competences.futs,
            garderie: data.competences.garderie
        };
      };
      var filename = req.params.id + '.csv';

      res.setHeader('Content-disposition', `attachment; filename=${filename}`);
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.flushHeaders();

      cursor.pipe(csv.transform(transformer))
        .pipe(csv.stringify({header: true}))
        .pipe(res);
});

// mail de rappel
router.get('/rappel',
    secure,
    require('connect-ensure-login').ensureLoggedIn(),
    function(req, res) {
      mongodb.participants.find().toArray(function(err, part) {
        var messHTML = '';
        for (var i = 0; i < part.length; i++) {
          var transporter = nodemailer.createTransport({
            service: '', // add email service name
            auth: {
                user: '', // TODO add post server user
                pass: '' // TODO add post server pwd
            }
          });
          var message = '<!DOCTYPE html><html lang="en-US"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head><body><img src="https://inscription.picfestival.com/img/eclair.png" alt="eclair"><br><b>Salut ' + part[i].contacts.prenom + ', </b><p>petit rappel avant le <a href="http://picfestival.com">festival</a>: </p><p>Voici tes dates à Pic: Tu viens du ' + part[i].dates.arrivee + ' au ' + part[i].dates.depart + ' (la semaine du 7 au 11 août 2018). Tu as participé aux frais à hauteur de ' + part[i].payement.total + '€. </p><p>Pour tous les détails sur l’édition 2018 de PIC, va voir ta <a href="https://inscription.picfestival.com/confirmation/' + part[i]._id + '">page d’info</a>. </p><p>Gros bisous et à très vite ! </p><p>Les orgas de l’amour</p><img src="https://inscription.picfestival.com/img/eclair.png" alt="eclair"></body></html>';
          var mailOptions = {
              from: '"PIC 2018 🎶" <bonjour@exemple.com>',
              to: part[i].contacts.mail,
              subject: "Rappel PIC 2018 - check la page info",
              text: striptags(message),
              html:  message
          };
          transporter.sendMail(mailOptions, function(err) {
            if(err) {
              messHTML += 'Erreur ';
            } else {
              messHTML += 'OK ';
            }
          });
        }
        res.send(messHTML);
      });
});

// HTTPS redirect
function secure(req, res, next) {
  if (req.headers['x-forwarded-proto'] == 'http') {
      res.redirect('https://' + req.headers.host + req.path);
  } else {
      return next();
  }
}

module.exports = router;
