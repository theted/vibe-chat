/**
 * RoomAura - three soft glows behind the top of the page, coloured by the
 * --room-h1..3 hues an ancestor sets (utils/roomVoices.ts). Without them it
 * shows the ambient hues registered in index.css.
 */

const RoomAura = () => (
  <div className="room-aura" aria-hidden="true">
    <span />
    <span />
    <span />
  </div>
);

export default RoomAura;
