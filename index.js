const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('flashfrontend/dist'));
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

app.get('/api/pirates/:id', (req,res) => {
    const id = req.params.id;
    const pirate = getPirate(id);
    if(!pirate)
    {
        res.status(404).send({error: `Pirate ${id} not found`});
    }
    else
    {
        res.send({data: pirate});
    }
})

function getPirate(id) {
    const pirates = [
        {id: 1, name: 'Klaus Störtebeker', active: '1392-1401', country: 'Germany'},
        {id: 2, name: 'Kristoffer Trondson', active: '1535-1542', country: 'Norway'},
        {id: 3, name: 'Jan de Bouff', active: '1602', country: 'Netherlands'},
        {id: 4, name: 'Jean Bart', active: '1672-1697', country: 'France'},
        {id: 5, name: 'Tuanku Abbas', active: 'to 1844', country: 'Malay Archipelago'},
        {id: 6, name: 'Ching Shih', active: '1807-1810', country: 'China'}
    ];
    
    return pirates.find(p => p.id == id);
}