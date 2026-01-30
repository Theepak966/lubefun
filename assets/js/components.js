function setCookie(key, value){
	var exp = new Date();

	exp.setTime(exp.getTime() + 365 * 24 * 60 * 60 * 1000);
	document.cookie = key + '=' + value + '; expires=' + exp.toUTCString() + '; path=/';
}

function getCookie(key){
	var patt = new RegExp(key + '=([^;]*)');

	var matches = patt.exec(document.cookie);

	if(matches) return matches[1];

	return null;
}

$(document).ready(function() {
	$(document).on('click', '[data-copy="text"]', function() {
		var text = $(this).attr('data-text').toString().trim();

		if(text.length <= 0) return;

		var $temp = $('<textarea>');
		$('body').append($temp);

		$temp.val(text).select();

		try {
			var successful = document.execCommand('copy');

			notify('success', 'Successfully copied to clipboard!');
		} catch(err) {
			notify('error', 'Unsuccessfully copied to clipboard!');
		}

		$temp.remove();
	});

	$(document).on('click', '[data-copy="input"]', function() {
		var $input = $($(this).attr('data-input'));

		$input.focus();
		$input.select();

		try {
			var successful = document.execCommand('copy');

			notify('success', 'Successfully copied to clipboard!');
		} catch(err) {
			notify('error', 'Unsuccessfully copied to clipboard!');
		}

		window.getSelection().removeAllRanges();
	});

    $(document).on('click', '[data-download]', function() {
        var text = $(this).attr('data-text').toString().trim();

        var blob = new Blob([ text ], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = $(this).data('download');

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);
	});
});

console.log('%cWARNING!', 'font-size: 26px; color: red;');
console.log('%cAdmin/Mods/Staff will NEVER ask you to paste text/code in this console.\n\nDo NOT paste anything in this console or use ANY third party extensions/applications, it WILL steal your coins and/or hack your account!', 'font-size: 20px;');

$(document).ready(function() {
	jQuery.fn.extend({
		resizeObserver: function(callback) {
			return this.each(function() {
				var observer = new ResizeObserver(function(entries) {
					entries.forEach(function(entry) {
						callback.call(entry.target);
					});
				});

				observer.observe(this);
			});
		},

		countToBalance: function(x) {
			var $this = $(this);

			var start = parseFloat($this.text());
			start = Math.floor(start * 100);

			var delta = Math.floor(x * 100 - start);

			if(delta >= 0) $this.addClass('text-success');
			else $this.addClass('text-danger');

			$({
				count: start
			}).animate({
				count: Math.floor(x * 100)
			}, {
				duration: 800,
				step: function(val) {
					var vts = Math.floor(val);

					$this.text(getFormatAmountString(vts / 100));
				},
				complete: function(){
					setTimeout(function(){
						$this.removeClass('text-success').removeClass('text-danger');
					}, 400);

					$this.text(getFormatAmountString(x));
				}
			});
		},

		countToFloat: function(x) {
			var $this = $(this);

			var start = parseFloat($this.text());
			start = Math.floor(start * 100);

			var delta = Math.floor(x * 100 - start);

			var dur = Math.min(400, Math.round(Math.abs(delta) / 500 * 400));

			$({
				count: start
			}).animate({
				count: Math.floor(x * 100)
			}, {
				duration: dur,
				step: function(val) {
					var vts = Math.floor(val);

					$this.text(roundedToFixed(vts / 100, 2).toFixed(2));
				},
				complete: function(){
					$this.text(getFormatAmountString(x));
				}
			});
		},

		countToProfit: function(x) {
			var $this = $(this);

			var start = parseFloat($this.text());
			start = Math.floor(start * 100);

			var delta = Math.floor(x * 100 - start);

			var dur = Math.min(400, Math.round(Math.abs(delta) / 500 * 400));

			$({
				count: start
			}).animate({
				count: Math.floor(x * 100)
			}, {
				duration: dur,
				step: function(val) {
					var vts = Math.floor(val);

					$this.removeClass('positive').removeClass('negative');

					if(vts < 0) $this.addClass('negative');
					else $this.addClass('positive');

					$this.text(roundedToFixed(Math.abs(vts) / 100, 2).toFixed(2));
				},
				complete: function(){
					$this.text(getFormatAmountString(x));
				}
			});
		},

		countToInt: function(x) {
			var $this = $(this);

			var start = parseInt($this.text());
			var delta = x - start;

			var durd = delta;
			var dur = Math.min(400, Math.round(Math.abs(durd) / 500 * 400));

			$({
				count: start
			}).animate({
				count: x
			}, {
				duration: dur,
				step: function(val) {
					var vts = Math.floor(val);

					$this.text(vts);
				},
				complete: function(){
					$this.text(parseInt(x));
				}
			});
		}
	});
});

$(document).ready(function() {
	toastr.options = {
		'closeButton': true,
		'debug': false,
		'newestOnTop': false,
		'progressBar': true,
		'positionClass': 'toast-top-right',
		'preventDuplicates': false,
		'onclick': null,
		'showDuration': '500',
		'hideDuration': '500',
		'timeOut': '10000',
		'extendedTimeOut': '2000',
		'showEasing': 'swing',
		'hideEasing': 'linear',
		'showMethod': 'fadeIn',
		'hideMethod': 'slideUp'
	}
});

function notify(type, notify){
	toastr[type](notify);
}

/* SWIPE */

var touch_settings = {
	released: false,
	x: 0,
	y: 0
};

function getTouches(e) {
	return e.touches || e.originalEvent.touches;
}

document.addEventListener('touchstart', function(e){
	var touch = getTouches(e)[0];

    touch_settings.x = touch.clientX;
    touch_settings.y = touch.clientY;

	touch_settings.released = true;
}, false);

document.addEventListener('touchend', function(e){
	touch_settings.released = false;
}, false);

document.addEventListener('touchmove', function(e){
	if(!touch_settings.released) return;

	var touch = e.touches[0];

	var threshold = 30; // pixels per frame

    var x = touch_settings.x - touch.clientX;
    var y = touch_settings.y - touch.clientY;

    if(Math.abs(x) > Math.abs(y)) {
        if(x > threshold) swipe_eventLeft();
		else if(x < -threshold) swipe_eventRight();
    } else {
        if(y > threshold) swipe_eventDown();
		else if(x < -threshold) swipe_eventUp();
    }

    touch_settings.x = touch.clientX;
    touch_settings.y = touch.clientY;
}, false);

function swipe_eventUp(){
	touch_settings.released = false;
}

function swipe_eventDown(){
	touch_settings.released = false;
}

function swipe_eventRight(){
	touch_settings.released = false;

	return;

	if(!isOnMobile()) return;

	var hide_menu = $('#page').hasClass('menu-active');
	var hide_chat = $('#page').hasClass('chat-active');

	var hide_admin = $('#page').hasClass('admin-active');

    if(!hide_chat) profile_settingsChange('chat', '0');
	else if(!hide_menu) resize_pullout('menu', false, false);

    if(!hide_admin && app.page == 'admin') resize_pullout('admin', false, false);
}

function swipe_eventLeft(){
	touch_settings.released = false;

	return;

	if(!isOnMobile()) return;

	var hide_menu = $('#page').hasClass('menu-active');
	var hide_chat = $('#page').hasClass('chat-active');

	var hide_admin = $('#page').hasClass('admin-active');

	if(hide_menu) resize_pullout('menu', true, false);
	else if(hide_chat) profile_settingsChange('chat', '1');

    if(hide_admin && app.page == 'admin') resize_pullout('admin', true, false);
}

/* END SWIPE */

/* CAROUSEL */

var carousel_timeout = null;
var carousel_animation = false;

$(document).ready(function() {
    $('.carousel').each(function(i, e) {
        $(this).find('.list .item:not(.active)').css('display', 'none');
    });

	$(document).on('click', '.carousel .action', function() {
		var type = $(this).data('type');
		var $carousel = $(this).closest('.carousel');

		changeCarousel($carousel, type);
	});

	carousel_timeout = setTimeout(function(){
		$('.carousel').each(function(i, e) {
			changeCarousel($(this), 'right');
		});
	}, 5000);
});

function changeCarousel($carousel, type){
    if(carousel_animation) return;

	var index = parseInt($carousel.find('.list .item.active').data('index')) || 0;
	var indexes = $carousel.find('.list .item').length;

	if(indexes <= 1) return;

	var width = $carousel.width();

	var next = index;
	if(type == 'right') if(++next >= indexes) next = 0;
	if(type == 'left') if(--next < 0) next = indexes - 1;

	var pos = 0;
	if(type == 'right') pos = -width;
	if(type == 'left') pos = width;

    carousel_animation = true;

    $carousel.find('.list .item').removeClass('active');

    $carousel.find('.list .item[data-index="' + next + '"]').addClass('active').css('display', 'unset').animate({
        'left': -pos + 'px'
    }, {
        'duration': 500,
        'queue': false,
        'easing': 'swing',
        'progress': function(animation, progress, remaining) {
            var las = -(1 - progress) * pos;

            $carousel.find('.list .item[data-index="' + next + '"]').css('left', las + 'px');
        },
        'complete': function() {
            $carousel.find('.list .item[data-index="' + next + '"]').css('display', 'unset');
        }
    });

    $carousel.find('.list .item[data-index="' + index + '"]').css('display', 'unset').animate({
        'left': '0px'
    }, {
        'duration': 500,
        'queue': false,
        'easing': 'swing',
        'progress': function(animation, progress, remaining) {
            var las = progress * pos;

            $carousel.find('.list .item[data-index="' + index + '"]').css('left', las + 'px');
        },
        'complete': function() {
            $carousel.find('.list .item[data-index="' + index + '"]').css('display', 'none');
        }
    });

    setTimeout(function(){
        carousel_animation = false;
    }, 500);

    if(carousel_timeout) clearTimeout(carousel_timeout);

	carousel_timeout = setTimeout(function(){
		changeCarousel($carousel, 'right');
	}, 5000);
}

/* END CAROUSEL */

/* SECTION */

$(document).ready(function() {
    $('.section').each(function(i, e) {
        $(this).find('.swiper').find('.list .item').first().addClass('active');

        checkSwiper($(this), 0);
    });

    $('.section .swiper').resizeObserver(function() {
        $(this).attr('style', '--swiper-length: ' + getSwiperColumns($(this), 210) + ' !important');

        var index = $(this).find('.list .item.active').index();
        checkSwiper($(this).closest('.section'), index);
    });

    $(document).on('click', '.section .action', function() {
		var type = $(this).data('type');
		var $section = $(this).closest('.section');

		changeSwiper($section, type);
	});
});

function getSwiperColumns($swiper, width = 240) {
    var swiperWidth = $swiper.width();
    var columnCount = Math.floor(swiperWidth / width);

    return columnCount > 0 ? columnCount : 1;
}

function changeSwiper($section, type){
	var $swiper = $section.find('.swiper');

    if($swiper.hasClass('active')) return;

    var index = $swiper.find('.list .item.active').index();

    var next = index;
    if(type == 'left') next = next - 1;
    else if(type == 'right') next = next + 1;

    checkSwiper($section, next);
}

function checkSwiper($section, next){
    var $swiper = $section.find('.swiper');

    var count = $swiper.find('.list .item').length;
    var length = parseInt($swiper.css('--swiper-length'));

    var index = $swiper.find('.list .item.active').index();

    next = Math.max(Math.min(next, count - length), 0);

    $swiper.find('.list .item.active').removeClass('active');
    $swiper.find('.list .item').eq(next).addClass('active');

    $swiper.removeClass('item-' + (index + 1)).addClass('item-' + (next + 1));

    $section.find('.action').removeClass('disabled');
    if(next <= 0) $section.find('.action[data-type="left"]').addClass('disabled');
    if(next >= count - length) $section.find('.action[data-type="right"]').addClass('disabled');

    $swiper.addClass('active');

    setTimeout(function(){
        $swiper.removeClass('active');
    }, 500);
}

/* END SECTION */

/* ACORDEON */

$(document).ready(function() {
    initializeAcordeons();

	$(document).on('click', '.acordeon .acordeon-item .acordeon-trigger', function() {
		if(!$(this).closest('.acordeon-item').hasClass('active')) {
			$(this).closest('.acordeon').find('.acordeon-item').removeClass('active');

			$(this).closest('.acordeon-item').addClass('active');
		} else $(this).closest('.acordeon-item').removeClass('active');
	});
});

function initializeAcordeons(){
    $('.acordeon .acordeon-item').each(function(i, e) {
		$(this).find('.acordeon-content').attr('style', '--acordeon-height: ' + $(this).find('.acordeon-content')[0].scrollHeight + 'px !important');
	});

    $('.acordeon .acordeon-item').resizeObserver(function() {
        $(this).find('.acordeon-content').attr('style', '--acordeon-height: ' + $(this).find('.acordeon-content')[0].scrollHeight + 'px !important');
    });
}

/* END ACORDEON */

/* INPUT FIELD */

$(document).ready(function() {
	initializeInputFields();

    $('.input_field').each(function(i, e) {
		var $input = $(this).find('.field_element_input');

        $input.attr('data-default', $input.val().toString());
	});
});

function initializeInputFields(){
	$('.input_field').each(function(i, e) {
		changeInputFieldLabel($(this));
        clearInputFieldError($(this));

        $(this).find('.field_bottom .field_error[data-error="default"]').addClass('active');
	});

	$(document).on('focusout', '.input_field .field_element_input', function() {
		var text = $(this).val().trim();
		var $field = $(this).closest('.input_field');

		if(text.length > 0) $field.find('.field_label').addClass('active');
		else $field.find('.field_label').removeClass('active');

		changeInputFieldLabel($field);
        verifyErrorInputField($field);
	});

	$(document).on('focus', '.input_field .field_element_input', function() {
		var $field = $(this).closest('.input_field');

		$field.find('.field_label').addClass('active');
	});

	$(document).on('input', '.input_field .field_element_input', function() {
		var $field = $(this).closest('.input_field');

        verifyErrorInputField($field);
	});

	$(document).on('click', '.input_field .field_element_password', function() {
		var $input = $(this).closest('.input_field').find('.field_element_input');

        var type = $(this).attr('data-type');

        if(type == 'show') $input.attr('type', 'text');
        if(type == 'hide') $input.attr('type', 'password');
	});
}

function changeInputFieldLabel($field){
	var text = $field.find('.field_element_input').val().trim();

	if(text.length > 0) $field.find('.field_label').addClass('active');
	else $field.find('.field_label').removeClass('active');
}

function clearInputFieldError($field){
	$field.find('.field_bottom .field_error:not([data-error="default"])').removeClass('active');
    $field.css('border', '2px solid var(--secondary)');
    $field.css('color', 'unset');
}

function verifyErrorInputField($field){
	var text = $field.find('.field_element_input').val().trim();

	var border = $field.data('border');

	var have_error = false;
	var required_error = false;

	$field.find('.field_bottom .field_error').removeClass('active');

	$field.find('.field_bottom .field_error').each(function(i, e) {
		var error_code = $(this).data('error');
		var error_local = false;

		if(error_code == 'required') required_error = true;

		if(text.length > 0){
			switch(error_code){
				case 'number':
					if(isNaN(Number(text))){
						have_error = true;
						error_local = true;
					}
					break;

				case 'positive_integer':
					if(!isNaN(Number(text))){
						if(Math.floor(Number(text)) != Number(text) || Math.floor(Number(text)) <= 0){
							have_error = true;
							error_local = true;
						}
					}
					break;

				case 'percentage':
					if(!isNaN(Number(text))){
						if(Number(text) < 0 || Number(text) > 100){
							have_error = true;
							error_local = true;
						}
					}
					break;

				case 'greater':
					var game = $field.find('.field_element_input').attr('data-amount');
					var amount = games_intervalAmounts[game] === undefined ? 0 : games_intervalAmounts[game].min;

					if(!isNaN(Number(text))){
						if(Number(text) < amount){
							have_error = true;
							error_local = true;
						}
					}
					break;

				case 'lesser':
					var game = $field.find('.field_element_input').attr('data-amount');
					var amount = games_intervalAmounts[game] === undefined ? 0 : games_intervalAmounts[game].max;

					if(!isNaN(Number(text))){
						if(Number(text) > amount){
							have_error = true;
							error_local = true;
						}
					}
					break;

                case 'name':
                    if(!/^.{2,64}$/.exec(text)){
                        have_error = true;
                        error_local = true;
                    }
                    break;

				case 'email':
					if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/.exec(text)){
						have_error = true;
						error_local = true;
					}
					break;

				case 'password':
					if(!/^((?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64})$/.exec(text)){
						have_error = true;
						error_local = true;
					}
					break;

				case 'minimum_6_characters':
					if(text.length < 6){
						have_error = true;
						error_local = true;
					}
					break;

				case 'minimum_10_characters':
					if(text.length < 10){
						have_error = true;
						error_local = true;
					}
					break;

				case 'only_letters_numbers':
					if(!(/(^[a-zA-Z0-9]*$)/.exec(text))){
						have_error = true;
						error_local = true;
					}
					break;
			}
		}

		if(error_local) $(this).addClass('active');
	});

	if(!have_error){
		if(required_error && text.length == 0) {
			$field.find('.field_bottom .field_error[data-error="required"]').addClass('active');
			have_error = true;
		} else $field.find('.field_bottom .field_error[data-error="default"]').addClass('active');
	}

	if(border.toString().trim().length > 0){
		//#484856
		if(have_error) {
			$field.css('border', '2px solid ' + border);
			$field.css('color', border);
		} else {
			if($field.find('.field_element_input').is(':focus') && text.length > 0) $field.css('border', '2px solid #66ff00');
			else $field.css('border', '2px solid var(--secondary)');

			$field.css('color', 'unset');
		}
	}
}

function resetInputFieldElement($field){
    var $input = $field.find('.field_element_input');

    $input.val($input.attr('data-default'));

    verifyErrorInputField($input.closest('.input_field'));
}

/* END INPUT FIELD */

/* DROPDOWN FIELD */

$(document).ready(function() {
	initializeDropdownFields();

    $('.dropdown_field').each(function(i, e) {
		var $input = $(this).find('.field_element_input');

        $input.attr('data-default', $input.val().toString());
	});
});

function initializeDropdownFields(){
	$('.dropdown_field').each(function(i, e) {
		changeDropdownFieldElement($(this));
	});

	$(document).on('click', function() {
		setTimeout(function(){
			$('.dropdown_field .field_element_dropdowns.active').removeClass('active');
		}, 50);
	});

	$(document).on('click', '.dropdown_field', function() {
		var $field = $(this);

		if($field.find('.field_element_dropdowns.active').length == 0){
			setTimeout(function(){
				var count = $field.find('.field_element_dropdowns .field_element_dropdown').length;
				var height = $field.find('.field_element_dropdowns').height();

				tinysort($field.find('.field_element_dropdowns .field_element_dropdown'), {
					data: 'index',
					order: 'asc'
				});

				if($field.hasClass('top')) $field.find('.field_element_dropdowns .field_element_dropdown[value="' + $field.find('.field_element_input').val() + '"]').appendTo($field.find('.field_element_dropdowns'));
				else $field.find('.field_element_dropdowns .field_element_dropdown[value="' + $field.find('.field_element_input').val() + '"]').prependTo($field.find('.field_element_dropdowns'));

				$field.find('.field_element_dropdowns').addClass('active');

				$field.find('.field_element_dropdowns .field_element_dropdown').removeClass('active');
				$field.find('.field_element_dropdowns .field_element_dropdown[value="' + $field.find('.field_element_input').val() + '"]').addClass('active');
			}, 100);
		}
	});

	$(document).on('click', '.field_element_dropdown', function() {
		var value = $(this).attr('value');

		var $field = $(this).closest('.dropdown_field');

		$field.find('.field_element_input').val(value).trigger('change');
	});

	$(document).on('change', '.field_element_input', function() {
		var $field = $(this).closest('.dropdown_field');

		changeDropdownFieldElement($field);
	});
}

function changeDropdownFieldElement($field){
	var value = $field.find('.field_element_input').val();
	var index = $field.find('.field_element_dropdowns .field_element_dropdown[value="' + value + '"]').index();
	var html = $field.find('.field_element_dropdowns .field_element_dropdown[value="' + value + '"]').html();

	$field.find('.field_dropdown').html(html);
}

function resetDropdownFieldElement($field){
    var $input = $field.find('.field_element_input');

    $input.val($input.attr('data-default'));

    changeDropdownFieldElement($field);
}

/* END DROPDOWN FIELD */

/* SWITCH FIELD */

$(document).ready(function() {
	initializeSwitchFields();

    $('.field_switch').each(function(i, e) {
		var $input = $(this).find('.field_element_input');

        $input.attr('data-default', $input.prop('checked'));
	});
});

function initializeSwitchFields(){
	$('.switch_field .field_switch').on('click', function() {
		var $field = $(this).closest('.switch_field');

        var $input = $field.find('.field_element_input');

		changeSwitchFieldElement($field, $input.prop('checked') ? false : true);

		$input.trigger('change');
	});
}

function changeSwitchFieldElement($field, checked){
	var $input = $field.find('.field_element_input');

    if(checked) $input.attr('checked', 'checked');
    else $input.removeAttr('checked');
}

function resetSwitchFieldElement($field){
    var $input = $field.find('.field_element_input');

    if($input.attr('data-default') == 'true') $input.attr('checked', 'checked');
    else $input.removeAttr('checked');

    changeSwitchFieldElement($field, $input.attr('data-default') == 'true');
}

/* SWITCH FIELD */

/* SLIDER FIELD */

$(document).ready(function() {
	initializeSliderFields();

    $('.slider_field').each(function(i, e) {
        var $input = $(this).find('.field_element_input');

        $input.attr('data-default', $input.val().toString());
	});
});

function initializeSliderFields(){
	$('.slider_field').each(function(i, e) {
		var $input = $(this).find('.field_element_input');

		changeSliderFieldElement($input);
	});

	$(document).on('input', '.slider_field .field_element_input', function() {
		changeSliderFieldElement($(this));
	});

	$(document).on('change', '.slider_field .field_element_input', function() {
		changeSliderFieldElement($(this));
	});
}

function changeSliderFieldElement($input){
	var min = parseFloat($input.prop('min')) || 0;
	var max = parseFloat($input.prop('max')) || 0;

	var percentage = max <= 0 ? 0 : ($input.val() - min) / (max - min) * 100;

	$input.css('backgroundSize', percentage + '% 100%');

	var $cursor = $input.parent().find('.field_cursor');

	if($cursor) {
		var fixed = parseInt($cursor.data('fixed'));

		$cursor.css('left', percentage + '%').find('.field_cursor_text').text(parseFloat($input.val()).toFixed(fixed));
	}
}

function resetSliderFieldElement($field){
    var $input = $($field).find('.field_element_input');

    $input.val($input.attr('data-default'));

    changeSliderFieldElement($input);
}

/* END SLIDER FIELD */

/* FILE FIELD */

$(document).ready(function() {
	initializeFileFields();
});

function initializeFileFields(){
	$(document).on('click', '.file_field .field_element_file', function() {
		var $field = $(this).closest('.file_field');

		$field.find('.field_element_input').trigger('click');
	});

	$(document).on('input', '.file_field .field_element_input', function(e) {
		var $field = $(this).closest('.file_field');

		var tmppath = URL.createObjectURL(e.target.files[0]);

		$field.find('.field_file').addClass('active');
		$field.find('.field_file img').attr('src', tmppath);
    });
}

/* END FILE FIELD */

/* MODAL */

$(document).ready(function() {
	$(document).on('click', '[data-modal="hide"]', function() {
		var $modal = $(this).closest('.modal');

		$modal.modal('hide');
	});

	$(document).on('click', '[data-modal="show"]', function() {
		$($(this).data('id')).modal('show');
	});

	$(document).on('click', '.modal .modal-dialog', function(e) {
		if(e.target !== e.currentTarget) return;

		$(this).closest('.modal').modal('hide');
	});
});

jQuery.fn.extend({
	modal: function(type) {
		var $modal = $(this);

		if($modal.hasClass('modal')){
			if(type == 'show'){
				modalShow($modal);
			} else if(type == 'hide'){
				if(!$modal.hasClass('locked')) modalHide($modal)
			}
		}
	}
});

function modalShow($modal){
	if(!$modal.hasClass('active')){
		$modal.css('opacity', 0);

		$modal.addClass('active');

		setTimeout(function(){
			$modal.css('opacity', 1);
		}, 50);

        modalReset($modal);

        $modal.find('.input_field').each(function(i, e) {
            changeInputFieldLabel($(this));
            clearInputFieldError($(this));
        });

		$modal.find('.input_field').find('.field_element_input').first().focus();

		$modal.trigger('show');
	}
}

function modalHide($modal){
	if($modal.hasClass('active')){
		$modal.css('opacity', 0);

		setTimeout(function(){
			$modal.removeClass('active');
		}, 200);

		$modal.trigger('hide');
	}
}

function modalReset($modal){
    $modal.find('.input_field').each(function(i, e) {
        resetInputFieldElement($(this));
    });

    $modal.find('.dropdown_field').each(function(i, e) {
        resetDropdownFieldElement($(this));
    });

    $modal.find('.switch_field').each(function(i, e) {
        resetSwitchFieldElement($(this));
    });

    $modal.find('.slider_field').each(function(i, e) {
        resetSliderFieldElement($(this));
    });
}

/* END MODAL */