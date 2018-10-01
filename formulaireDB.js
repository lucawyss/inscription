// My module
function FormulaireDB(req) {this.req = req;}

FormulaireDB.prototype.form = function form() {

  // set dejaVenu value
  if(this.req.body.dejaVenu == 'true') {
    var xdejaVenu = [];
    if(this.req.body.dejaVenu2012 == 'true') {xdejaVenu.push("Avant 2012");}
    if(this.req.body.dejaVenu2014 == 'true') {xdejaVenu.push("Fest 2014");}
    if(this.req.body.dejaVenu2015 == 'true') {xdejaVenu.push("Fest 2015");}
    if(this.req.body.dejaVenu2017 == 'true') {xdejaVenu.push("Fest 2017");}
  } else {
    var xdejaVenu = 'false';
  }

  // set preferences alimentaires variable
  if(this.req.body.sansPorc == 'true' || this.req.body.sansGluten == 'true' || this.req.body.sansViande == 'true') {
    var xSansPref = [];
    if(this.req.body.sansPorc == 'true') {xSansPref.push("Sans porc");}
    if(this.req.body.sansGluten == 'true') {xSansPref.push("Sans gluten");}
    if(this.req.body.sansViande == 'true') {xSansPref.push("Végétarien");}
  } else {
    var xSansPref = 'false';
  }

  // set proposition variable
  if(this.req.body.concert == 'true' || this.req.body.spectacle == 'true' || this.req.body.atelier == 'true' || this.req.body.activite == 'true') {
    var xPropType = [];
    if(this.req.body.concert == 'true') {xPropType.push("Concert");}
    if(this.req.body.spectacle == 'true') {xPropType.push("Spectacle");}
    if(this.req.body.numero == 'true') {xPropType.push("Numero");}
    if(this.req.body.atelier == 'true') {xPropType.push("Atelier");}
    if(this.req.body.activite == 'true') {xPropType.push("Autre activité");}
    var xProposition = {
      type: xPropType,
      titre: this.req.body.titre,
      description: this.req.body.description
    };
  } else {
    var xProposition = {
      type: 'false',
      titre: 'false',
      description: 'false'
    };
  }

  var data = {
    contacts: {
      prenom: this.req.body.prenom,
      nom: this.req.body.nom,
      mail: this.req.body.mail,
      telephone: this.req.body.telephone,
      dejaVenu: xdejaVenu,
      organisateur: this.req.body.organisateur,
      enfants: this.req.body.enfants,
      nbEnfants: this.req.body.nbEnfants
      },
    dates: {
      arrivee: this.req.body.datesArrivee,
      depart: this.req.body.datesDepart,
      nbRepas: this.req.body.datesRepas,
      prefAlim: xSansPref
      },
    competences: {
      medicale: this.req.body.medicale,
      electricite: this.req.body.electricite,
      plomberie: this.req.body.plomberie,
      restauration: this.req.body.restauration,
      techspectacle: this.req.body.son,
      travaux: this.req.body.travaux,
      futs: this.req.body.futs,
      garderie: this.req.body.garderie
      },
    proposition: xProposition,
    charte: true,
    payement: {
      total: 24 + (this.req.body.datesRepas * 3) + parseFloat(this.req.body.adhesions),
      forfait: 24,
      repas: this.req.body.datesRepas * 3,
      adhesions: parseFloat(this.req.body.adhesions),
      stripeToken: this.req.body.stripeToken,
      confirmation: 'false',
      solidarite: this.req.body.solidarite
      }
  };
  return data;

};
module.exports = FormulaireDB;
