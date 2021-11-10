const getValue = () => { 
    const userID = document.getElementById('name').value   
    console.log(userID);

    startEval(userID);
}

const startEval = (userID) => {
    fetch('/api/compute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            id: userID,
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
    .catch((error) => {
        console.error('Error:', error);
    })
}

