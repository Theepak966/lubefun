/* AUTH */

$(document).ready(function() {
	$('.form_auth').on('submit', function(e) {
		e.preventDefault();

		$.ajax({
			url: $(this).attr('action'),
			type: $(this).attr('method'),
			data: $(this).serialize(),
			success: function(data){
                if(data.reload) location.reload();
                else notify('success', data.message);
			},
			error: function(err){
				notify('error', err.responseJSON.error);

                sounds_play('error');
			}
		});
	});
});

/* END AUTH */