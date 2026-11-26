(() => {
  // Each answer is the companion's own pick in that round.
  const rounds = {
    chris: [
      ['What would I photograph at dusk?', 'A glowing shop window', 'A skyline', 0, 'A window lets you catch a whole little world in one frame.'],
      ['Where would I park for a sunset?', 'Right in town', 'A quiet bend in the road', 1, 'That bend has the widest patch of sky.'],
      ['What would I bring on a night drive?', 'A playlist', 'A route map', 0, 'I’ll take the long way if the song is good.']
    ],
    kim: [
      ['Where would I go after rehearsal?', 'A record shop', 'A rooftop', 0, 'I could spend hours looking through the sleeves.'],
      ['What would I share first?', 'A dance step', 'A song I can’t shake', 1, 'Songs say things I’d stumble over out loud.'],
      ['How would I learn a chorus?', 'Count it out', 'Find the beat', 1, 'My feet usually get there before I do.']
    ],
    julian: [
      ['What would I cook for two?', 'Fresh pasta', 'A chocolate cake', 0, 'There’s a job for both of us when we roll out the dough.'],
      ['Where would I stop on the drive home?', 'A lookout', 'A bakery', 1, 'I always want to know what just came out of the oven.'],
      ['What would I put on the table?', 'Candles', 'Fresh herbs', 1, 'A little basil changes the whole room.']
    ],
    enzo: [
      ['Which seat would I take at a jazz club?', 'Near the piano', 'By the door', 0, 'I like seeing the player’s hands pause between notes.'],
      ['What would I bring to the coast?', 'A book of poems', 'A sketchpad', 0, 'There’s a page I’ve been saving for the sea.'],
      ['What makes a good encore?', 'A familiar standard', 'One improvised phrase', 1, 'That last little surprise is the part I remember.']
    ],
    hayes: [
      ['Which shelf would I browse first?', 'New releases', 'Used books', 1, 'Sometimes the notes in the margins are a second story.'],
      ['What would I do on a rainy afternoon?', 'Read by the window', 'Walk to the market', 0, 'The rain usually chooses the soundtrack for me.'],
      ['What would I use as a bookmark?', 'A ribbon', 'A train ticket', 1, 'It reminds me of where I first opened the book.']
    ]
  };
  const scenes = {
    chris: ['On our night drive, a photograph slips out of the glove box.', 'Follow the road in the photo', 'Turn it over', 'a hill above the sleeping city', 'a handwritten invitation'],
    kim: ['After rehearsal we find an unmarked record backstage.', 'Play the first track', 'Read the sleeve', 'a melody neither of us can place', 'a dedication in silver ink'],
    julian: ['A recipe card falls from an old cookbook as we set the table.', 'Start cooking', 'Read the margin', 'the scent of citrus and rosemary', 'a date circled in pencil'],
    enzo: ['At the end of the pier, a page of music catches on my shoe.', 'Hum the first line', 'Lift the folded corner', 'a tune that seems to answer the tide', 'the address of a tiny jazz club'],
    hayes: ['At closing time we find a pressed leaf inside a returned book.', 'Look up the tree', 'Check the next page', 'a hidden garden behind the shop', 'a map drawn in green ink']
  };
  function render(character, openMenu, requestUpgrade) {
    const name = character.shortName;
    const heading = subtitle => `<div class="game-heading"><img src="${character.image}" alt=""><div><p>Play with ${name}</p><h2 id="dialog-title">${subtitle}</h2></div></div>`;
    const button = text => `<button class="game-choice" type="button">${text}</button>`;
    function screen(title, text, labels, choose) {
      showDialog(`${heading(title)}<p class="game-copy">${text}</p><div class="game-options">${labels.map(button).join('')}</div><button class="text-link game-back" type="button">All games</button>`,{focusSelector:'.game-choice'});
      dialogContent.querySelectorAll('.game-choice').forEach((b,i)=>b.onclick=()=>choose(i));
      dialogContent.querySelector('.game-back').onclick=openMenu;
    }
    function quiz(index,score) {
      const data=rounds[character.id], [question,a,b,pick,reason]=data[index];
      screen('Same wavelength', `Round ${index+1} of ${data.length} · ${question}`, [a,b], choice=>{
        const next=score+Number(choice===pick);
        screen(choice===pick?'You guessed it.':`${name} chose ${[a,b][pick]}.`, reason, [index===data.length-1?'See result':'Next round'], ()=>{
          if (index+1<data.length) quiz(index+1,next);
          else screen('Your result',`You guessed ${next} of ${data.length} of ${name}’s choices.`,['Play again'],()=>quiz(0,0));
        });
      });
    }
    function story() {
      if(!window.RizzoraIP.isVIP()) { requestUpgrade(); return; }
      const [start,a,b,first,second]=scenes[character.id];
      screen('Between the lines',start,[a,b],choice=>{
        const find=choice===0?first:second;
        screen('Your next move',`We find ${find}. ${name} looks at you. “What shall we do?”`, ['Follow the lead','Keep it between us'],end=>{
          const ending=end===0?`We follow the trail of ${find} until sunrise. “Same time tomorrow?” ${name} asks.`:`We leave with just the memory of ${find}. On the way home, ${name} catches your eye and smiles.`;
          screen('The final scene',ending,['Try another ending'],story);
        });
      });
    }
    return {quiz:()=>quiz(0,0),story};
  }
  window.RizzoraPlay = {render};
})();
