const getValue = () => { 
    const userID = document.getElementById('name').value   
    console.log(userID);

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
    .then(blunderData => {

        console.log(blunderData);
        const listOfMoves = Object.keys(blunderData)

        const labels = [...Array(parseInt(listOfMoves[listOfMoves.length - 1])).keys()].map(x => `move ${x + 1}`)
const data = {
  labels: labels,
  datasets: [{
    label: 'Number of blunders per move',
    data: [...Array(parseInt(listOfMoves[listOfMoves.length - 1])).keys()].map(x => blunderData[x + 1] || 0),
    backgroundColor: [
      'rgba(255, 0, 0, 0.2)',
    ],
    borderColor: [
      'rgb(255, 0, 0)',
    ],
    borderWidth: 1
  }]
};

const config = {
    type: 'bar',
    data: data,
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    },
  };

  const myChart = new Chart(
    document.getElementById('chart'),
    config
  );
    })
    .catch((error) => {
        console.error('Error:', error);
    })
}



