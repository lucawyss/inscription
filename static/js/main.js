'use strict';

// call slider & make it interactive with calendar
function calendar() {
	// call the slider
	var slider = document.getElementById('dates');
        noUiSlider.create(slider, {
               start: [0, 9],
               connect: true,
               step: 1,
               range: {
                 'min': 0,
                 'max': 9
               },
               format: wNumb({
                 decimals: 0
               })
            });

    // bound the calendar with the slider
	slider.noUiSlider.on('update', function(){
		var dates = slider.noUiSlider.get();
		for (var i = 1; i < 10; i++) {
			var repasClass = '.repas' + i;
			if(i > dates[0] && i <= dates[1]){$(repasClass).removeClass('lighten-4');}
			else {$(repasClass).addClass('lighten-4');}
		}
	});

    // updates the info from slider/calendar
    var jourArrivee = ['Mardi aprem', 'Mercredi matin', 'Mercredi aprem', 'Jeudi matin', 'Jeudi aprem', 'Vendredi matin', 'Vendredi aprem', 'Samedi matin', 'Samedi aprem', 'Dimanche matin', 'Dimanche aprem'];
	var jourDepart = ['Mardi aprem','Mardi soir', 'Mercredi aprem', 'Mercredi soir', 'Jeudi aprem', 'Jeudi soir', 'Vendredi aprem', 'Vendredi soir', 'Samedi aprem', 'Samedi soir', 'Dimanche aprem'];
    var infoArrivee = document.getElementById('info-arrivee'),
    	infoDepart = document.getElementById('info-depart'),
    	infoPrix = document.getElementById('info-prix'),
    	infoRepas = document.getElementById('info-repas');
	slider.noUiSlider.on('update', function(){
		var dates = slider.noUiSlider.get();
		var repas = dates[1] - dates[0];
		var prix = 3 * repas + 24;
		infoArrivee.innerHTML = 'Arrivée le ' + jourArrivee[dates[0]];
		document.getElementById("dates-arrivee").value = jourArrivee[dates[0]];
		infoDepart.innerHTML = 'Départ le ' + jourDepart[dates[1]];
		document.getElementById("dates-depart").value = jourDepart[dates[1]];
		infoRepas.innerHTML = repas + ' repas';
		document.getElementById("dates-repas").value = repas;
		infoPrix.innerHTML = 'prix total ' + prix + ' €';
		document.getElementById("prixRepas").innerHTML = repas * 3 + ',00 €';

	});

}

// make calendar setting the slider
function calTab(repas) {
	var slider = document.getElementById('dates');
	slider.noUiSlider.set(repas);
}

// Stripe init
Stripe.setPublishableKey('pk_live_uSmvTUH0WoGAKPizyU4pKBfW');
$(function() {
	var $form = $('#payment-form');
	$form.submit(function(event) {
		// Disable the submit button to prevent repeated clicks:
		$form.find('.submit').prop('disabled', true);

		// Request a token from Stripe:
		Stripe.card.createToken($form, stripeResponseHandler);

		// Prevent the form from being submitted:
		return false;
	});
});
function stripeResponseHandler(status, response) {
	// Grab the form:
	var $form = $('#payment-form');

	if (response.error) { // Problem!

		// Show the errors on the form:
		$form.find('.payment-errors').text(response.error.message);
		$form.find('.submit').prop('disabled', false); // Re-enable submission

	} else { // Token was created!

		// Get the token ID:
		var token = response.id;

		// Insert the token ID into the form so it gets submitted to the server:
		$form.append($('<input type="hidden" name="stripeToken">').val(token));

		// Submit the form:
		$form.get(0).submit();
	}
};

// Multi-step validation form
$(function () {
  var $sections = $('.form-section');

  function navigateTo(index) {
    // Mark the current section with the class 'current'
    $sections
      .removeClass('current')
      .eq(index)
        .addClass('current');
    // Show only the navigation buttons that make sense for the current section:
    $('.form-navigation .previous').toggle(index > 0);
    var atTheEnd = index >= $sections.length - 1;
    $('.form-navigation .next').toggle(!atTheEnd);
    $('.form-navigation [type=submit]').toggle(atTheEnd);
  }

  function curIndex() {
    // Return the current index by looking at which section has the class 'current'
    return $sections.index($sections.filter('.current'));
  }

  // Previous button is easy, just go back
  $('.form-navigation .previous').click(function() {
    navigateTo(curIndex() - 1);
  });

  // Next button goes forward iff current block validates
  $('.form-navigation .next').click(function() {
			updateTotal(0);
			var attr = '*[data-verif="part-' + curIndex() + '"]';
			var verificationErr = false;
			$(attr).each(function() {
				if(!this.checkValidity()) {verificationErr = true;}
			});
			if(curIndex() == 0 && !checkQuota()) {var quotaErr = true;}
			var invitErr = (document.getElementById('verifMail').value == 'false');
			if (verificationErr) {
			  $('#payment-form').find(':submit').click();
			} else if(quotaErr) {
				document.getElementById('quota-message').innerHTML = "Désolé, on a plus de places...";
			} else if(invitErr) {
				document.getElementById('quota-message').innerHTML = "L'adresse mail est incorrect… As-tu vraiment été invité ? Chaque inscription est vérifiée ; si tu n’as pas été réellement invité-e ton inscription pourra être invalidée et ta contribution sera considérée comme un don philanthrope pour PIC ! Bonus: Tu seras indiqué dans les remerciements !";
			} else {
				document.getElementById('quota-message').innerHTML = '';
				navigateTo(curIndex() + 1);
				location.hash = "#top";
			}
  });


  // Prepare sections by setting the `data-parsley-group` attribute to 'block-0', 'block-1', etc.
  $sections.each(function(index, section) {
    $(section).find(':input').attr('data-verif', 'part-' + index);
  });
  navigateTo(0); // Start at the beginning
});

// update value Total in formation
function updateTotal(nb){
	document.getElementById('prixAdhesion').innerHTML = nb + ',00 €';
	var prixRepas = document.getElementById('prixRepas').innerHTML;
	var prixTotal = parseFloat(nb) + 24;
	if(prixRepas) { prixTotal = prixTotal +parseFloat(prixRepas);}
	document.getElementById('prixTotal').innerHTML = prixTotal + ',00 €';
}

// quota
function checkQuota() {
	var quota = document.getElementById('quota').value;
	var totalPart = document.getElementById('totalPart').value;

	// check if total < than 300
	if(totalPart > 300) {
			return false;
	} else {
			return true;
	}
}

// verif email de l'orga invitant
function verifMail(email) {
	$.get( "/verifMail/" + email, function( data ) {
		document.getElementById('verifMail').value = data;
	});
}

// make form input into an email body
function FormInMail() {
	var mailbody = '\r\n\r\n' + '****' + '\r\n';
	mailbody += '## MES INFOS' + '\r\n';
	mailbody += 'Nom: ' + document.getElementsByName('prenom')[0].value + ' ' + document.getElementsByName('nom')[0].value + '\r\n';
	mailbody += 'Email: ' + document.getElementsByName('mail')[0].value + '\r\n';
	mailbody += 'Téléphone: ' + document.getElementsByName('telephone')[0].value + '\r\n';
	mailbody += 'deja venu ? ' + document.getElementById("dejaVenu").checked + '\r\n';
	mailbody += 'Orga invitant: ' + document.getElementsByName('organisateur')[0].value + '\r\n';
	mailbody += 'Dates: du ' + document.getElementsByName('datesArrivee')[0].value + ' au ' + document.getElementsByName('datesDepart')[0].value + '\r\n';
	mailbody += 'Total à payer: ' + Math.round((document.getElementsByName('datesRepas')[0].value * 3 + 23) * 1.2) + '€ + participation libre' + '\r\n';
	mailbody += 'Proposition: ' + document.getElementsByName('titre')[0].value + '\r\n';
	mailbody += document.getElementsByName('description')[1].value + '\r\n';
	mailbody = encodeURIComponent(mailbody);
	var mailsub = '[PIC] Inscription sans carte bancaire'
	mailsub = encodeURIComponent(mailsub);

	window.open('mailto:bonjour@picfestival.com?subject=' + mailsub + '&body=' + mailbody, '_blank');
	return false;
}
