// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgA9o-bhzUK_DG7B6t49VJg8rCpvJIbtk",
  authDomain: "magic-the-gatherer.firebaseapp.com",
  databaseURL: "https://magic-the-gatherer-default-rtdb.firebaseio.com",
  projectId: "magic-the-gatherer",
  storageBucket: "magic-the-gatherer.firebasestorage.app",
  messagingSenderId: "948571102250",
  appId: "1:948571102250:web:b741ded7dfcb486c6e7753",
  measurementId: "G-L2EVPGGGHG"
};

// ✅ Initialize Firebase FIRST
firebase.initializeApp(firebaseConfig);

// ✅ Initialize services AFTER Firebase
const db = firebase.database();
const firestore = firebase.firestore();


// ==========================================
// FEEDBACK FORM
// ==========================================

const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const submission = {
      name,
      email,
      message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('feedbackSubmissions').push(submission)
      .then(() => {
        formMessage.style.display = 'block';
        formMessage.style.backgroundColor = '#d4edda';
        formMessage.style.color = '#155724';
        formMessage.textContent = 'Thank you for your feedback!';
        contactForm.reset();
      })
      .catch((error) => {
        formMessage.style.display = 'block';
        formMessage.style.backgroundColor = '#f8d7da';
        formMessage.style.color = '#721c24';
        formMessage.textContent = 'Error submitting form.';
        console.error(error);
      })
      .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  });
}


// ==========================================
// FAVORITES SYSTEM
// ==========================================

// CREATE
async function addToFavorites(cardData) {
  try {
    const docRef = await firestore.collection('favorites').add({
      cardId: cardData.id,
      cardName: cardData.name,
      cardImage: cardData.imageUrl,
      cardType: cardData.typeLine,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      notes: ''
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding:', error);
    return { success: false, error: error.message };
  }
}

// READ
async function getFavorites() {
  try {
    const snapshot = await firestore.collection('favorites')
      .orderBy('addedAt', 'desc')
      .get();

    const favorites = [];
    snapshot.forEach(doc => {
      favorites.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, favorites };
  } catch (error) {
    console.error(error);
    return { success: false, favorites: [] };
  }
}

// CHECK
async function checkIfFavorited(cardId) {
  try {
    const snapshot = await firestore.collection('favorites')
      .where('cardId', '==', cardId)
      .get();

    if (snapshot.empty) {
      return { isFavorited: false };
    }

    return {
      isFavorited: true,
      docId: snapshot.docs[0].id
    };
  } catch (error) {
    console.error(error);
    return { isFavorited: false };
  }
}

// UPDATE
async function updateFavoriteNotes(docId, newNotes) {
  try {
    await firestore.collection('favorites').doc(docId).update({
      notes: newNotes
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

// DELETE
async function removeFromFavorites(docId) {
  try {
    await firestore.collection('favorites').doc(docId).delete();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}


// ==========================================
// FAVORITE BUTTON LOGIC
// ==========================================

async function initFavoritesButton() {
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (!favoriteBtn) return;

  const urlParams = new URLSearchParams(window.location.search);
  let cardId = urlParams.get('id') || window.currentCardId;

  if (!cardId) return;

  // Check if already favorited
  const status = await checkIfFavorited(cardId);

  if (status.isFavorited) {
    updateFavoriteButton(true, status.docId);
  }

  favoriteBtn.addEventListener('click', async () => {
    const isFavorited = favoriteBtn.classList.contains('favorited');
    const docId = favoriteBtn.getAttribute('data-doc-id');

    favoriteBtn.disabled = true;

    if (isFavorited && docId) {
      const result = await removeFromFavorites(docId);

      if (result.success) {
        updateFavoriteButton(false);
        showFavoriteMessage('Removed from favorites');
      }
    } else {
      const cardData = {
        id: cardId,
        name: document.querySelector('.card-name')?.textContent,
        imageUrl: document.querySelector('.card-art')?.src,
        typeLine: document.querySelector('.type-line')?.textContent
      };

      const result = await addToFavorites(cardData);

      if (result.success) {
        updateFavoriteButton(true, result.id);
        showFavoriteMessage('Added to favorites');
      }
    }

    favoriteBtn.disabled = false;
  });
}


function updateFavoriteButton(isFavorited, docId = null) {
  const btn = document.getElementById('favoriteBtn');
  if (!btn) return;

  if (isFavorited) {
    btn.classList.add('favorited');
    btn.innerHTML = '♥ Favorited';
    btn.setAttribute('data-doc-id', docId);
  } else {
    btn.classList.remove('favorited');
    btn.innerHTML = '♡ Add to Favorites';
    btn.removeAttribute('data-doc-id');
  }
}


function showFavoriteMessage(message) {
  const msg = document.getElementById('favoriteMessage');
  if (!msg) return;

  msg.textContent = message;
  msg.style.display = 'block';

  setTimeout(() => {
    msg.style.display = 'none';
  }, 2500);
}