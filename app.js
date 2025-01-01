let express = require("express");
let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database("database.db");
const os = require('os');


let app = express();

function getWiFiIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    let wifiIPAddress = null;

    // Loop through all network interfaces
    for (const interfaceName in networkInterfaces) {
        // Filter through the interface addresses
        const addresses = networkInterfaces[interfaceName];
        for (const address of addresses) {
            // Check for IPv4, non-internal, and possibly Wi-Fi related interface names
            if (
                address.family === 'IPv4' && 
                !address.internal &&
                (interfaceName.toLowerCase().includes('wi-fi') || interfaceName.toLowerCase().includes('wlan'))
            ) {
                wifiIPAddress = address.address;
            }
        }
    }

    return wifiIPAddress || 'No Wi-Fi IP address found';
}


function escapeHtml(unsafe)
{
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

app.use("/public",express.static("./public"));
app.use(express.urlencoded({extended: true}));

app.set('view engine','ejs');
app.listen(80,"0.0.0.0",() => {
    console.log("------------------------------------------");
    console.log("NoteShare is running on your local network");
    console.log(`http://${getWiFiIPAddress()}/`);
    console.log("------------------------------------------");

});

app.get("/",(req,res) => {
    db.all("SELECT name FROM notebooks WHERE 1=1",(err,rows) => {
        res.render("index",{rows: rows});
    });
});

app.get("/new",(req,res) => {
    res.render("new",{backend: ""});
});

app.post("/new",(req,res) => {
    let name = req.body.name;
    let content = req.body.content;
    db.all("SELECT * FROM notebooks WHERE name=?",[name],(err,rows) => {
        if (rows.length > 0){res.render("new",{backend: "Notebook like this , already exists"});}
        else{
            db.run("INSERT INTO notebooks VALUES  (?,?)",[name,content]);
            res.redirect("/");
        }
    });
});
app.get("/view/:id",(req,res) => {
    let book = req.params.id;
    db.all("SELECT content FROM notebooks WHERE name=?",[book],(err,rows) => {
        if (rows.length < 1){res.redirect(`/not_existing/${book}`);}
        else{
            res.render("view",{title: escapeHtml(book), content: escapeHtml(rows[0].content).replaceAll("\r\n","<br>")});
        }
    });

});
app.get("/delete/:id",(req,res) => {
    db.run("DELETE FROM notebooks WHERE name=?",[req.params.id],() => {
        res.redirect("/");
    });
});

app.get("/edit/:id",(req,res) => {
    db.all("SELECT content FROM notebooks WHERE name=?",[req.params.id],(err,rows) => {
        res.render("edit",{title: req.params.id , content: rows[0].content});
    });
});

app.post("/edit/:id",(req,res) => {
    let content = req.body.content;
    db.run("UPDATE notebooks SET content=? WHERE name=?",[content,req.params.id],() => {
        res.redirect(`/view/${req.params.id}`);
    });

});

//404
app.use((req,res) => {
    res.render("404");
});