<!-- Only the <script> portion changes — keep your existing HTML & CSS above -->
<script>
document.addEventListener('DOMContentLoaded', () => {
  // … your navigation handlers here …

  // Autocomplete + Geocoder fallback
  window.initAutocomplete = () => {
    const input = document.getElementById('autocomplete');
    const auto = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'ca' }
    });
    auto.setFields(['place_id','address_components','formatted_address','geometry']);

    const geocoder = new google.maps.Geocoder();

    auto.addListener('place_changed', () => {
      const p = auto.getPlace();
      console.log('Place selected:', p.formatted_address);
      document.getElementById('hAddress').value = p.formatted_address;

      const c = p.address_components;
      document.getElementById('hCity').value =
        (c.find(x=>x.types.includes('locality'))||
         c.find(x=>x.types.includes('postal_town'))||{}).long_name || '';
      document.getElementById('hProvince').value =
        (c.find(x=>x.types.includes('administrative_area_level_1'))||{}).short_name || '';
      document.getElementById('hLat').value        = p.geometry.location.lat();
      document.getElementById('hLng').value        = p.geometry.location.lng();

      // Try direct postal_code first
      let postal = (c.find(x=>x.types.includes('postal_code'))||{}).long_name || '';
      if (postal) {
        document.getElementById('hPostalCode').value = postal;
      } else {
        // Fallback: reverse-geocode using place_id
        geocoder.geocode({ placeId: p.place_id }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const comps = results[0].address_components;
            const pc = comps.find(x=>x.types.includes('postal_code'))?.long_name || '';
            document.getElementById('hPostalCode').value = pc;
            console.log('Postal from geocoder:', pc);
          } else {
            console.warn('Geocoder failed:', status);
          }
        });
      }
    });
  };

  // … nextStep / prevStep / submit handlers unchanged …
});
</script>

<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDG0cayJFC0huA0UEqr5o-1aDxeZ0dHDSM&libraries=places&callback=initAutocomplete" async defer></script>
