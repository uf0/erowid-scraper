var request = require('superagent'),
    cheerio = require('cheerio'),
    d3 = require('d3'),
    fs = require('fs');

var experiences = fs.readFileSync('data/input.csv', encoding='utf8');

experiences = d3.csv.parse(experiences)

var format = d3.time.format('%b %e %Y'),
    formatYear = d3.time.format('%Y');

var count = 0
var expTotal = experiences.length;
//var expTotal = 36;

var output = [];

var getInfo = function(exp){
  var url = exp.href
  request
      .get(url)
      .end(function(err, res) {
        if(err){console.log(err);
          count++
          if((count+1) > expTotal){
            write(output);
            return;
          }else{
            getInfo(experiences[count])
          }
          }

        var $ = cheerio.load(res.text)
        var id = exp.href.split('=')[1]
        var title = exp.title;
        var submission = format.parse(exp.date);
        submission.setHours(0, -submission.getTimezoneOffset(), 0, 0);
        submission = submission.toISOString();

        var table  = $('body > div.report-text-surround > table.footdata').text()

        var experience = matchExperience(table)
        if(experience){
          experience = formatYear.parse(experience[1])
          experience.setHours(0, -experience.getTimezoneOffset(), 0, 0);
          experience = experience.toISOString();
        }else{
          experience = '';
        }

        var name = exp.name;

        var gender = matchGender(table);

        if(gender){
          gender = gender[1].toLowerCase()
        }else{
          gender = '';
        }

        var age = matchAge(table);

        if(age){
          age = parseInt(age[1])
        }else{
          age = '';
        }

        var views = matchViews(table);

        if(views){
          views = views[1].replace(',','')
        }else{
          views = '';
        }

        var weight = $('td.bodyweight-amount').text()
        weight = weight.split(' ')
        if(weight[1]=='lb'){
          weight = Math.round(weight[0] * 0.45359237)
        }else if(weight[1]=='kg'){
          weight = parseInt(weight[0])
        }else {
          weight = ''
        }

        var dose = [];

        $('body > div.report-text-surround > table.dosechart tr').each(function(i,d){

          var time = matchTime($(d).children('td').eq(0).text());
          time = time?+time[1]:0;
          var administration = $(d).children('td').eq(2).text();
          var substance = $(d).children('td').eq(3).text();
          var form = $(d).children('td').eq(4).text().replace('(','').replace(')','').trim();
          var amount = $(d).children('td').eq(1).text();
          amount = amount.split(' ')

          var quantity,
              units,
              grams;

          if(amount.length > 1){
            if(amount[1].trim() != 'g' && amount[1].trim() != 'mg' && amount[1].trim() != 'ug'){
              quantity = isNaN(+amount[0])?amount[0]:+amount[0];
              amount = amount.splice(0,1);
              units = amount.join(' ');
              grams = '';
            }else {
              if(amount[1].trim() == 'g'){
                quantity = +amount[0];
                units = 'g';
                grams = +amount[0];
              }else if(amount[1].trim() == 'mg') {
                quantity = +amount[0];
                units = 'mg';
                grams = +amount[0]/1000;
              }else {
                quantity = +amount[0];
                units = 'ug';
                grams = +amount[0]/1000/1000;
              }
            }
          }else{
            quantity = isNaN(+amount[0])?amount[0]:+amount[0];
            units = '';
            grams = '';
          }

          var elm = {
            time: time,
            amount:{
              quantity: quantity,
              units: units,
              grams: grams
            },
            administration: administration,
            substance: substance,
            form: form
          }

          dose.push(elm)
        })

        $('body > div.report-text-surround table').each(function(){
          $(this).remove()
        })

        var report = $('body > div.report-text-surround').text().trim().split('\r\n\r\n')

        var expOut = {
          id: 'u_' + count,
          title: title,
          date:{
            submission: submission,
            experience: experience
          },
          author:{
            name:name,
            gender: gender,
            weight: weight,
            age:age
          },
          dose: dose,
          report: report,
          erowid:{
            id:id,
            views: views
          }
        }

        output.push(expOut)

        console.log((count+1)+'/' + expTotal, exp.title)
        count++
        if((count+1) > expTotal){
          write(output)
          return;
        }else{
          getInfo(experiences[count])
        }
      });
}

getInfo(experiences[count])

var trim = function trim(str) {
    return str.replace(/(^(\s|\n|\t)+)|((\s|\n|\t)+$)/g, '');
  };

var matchExperience = function matchExperience(str) {
    return str.match(/([0-9][0-9][0-9][0-9])ExpID/);
  };

var matchGender = function matchGender(str) {
    return str.match(/Gender: (.*?)\s/);
  };

var matchAge = function matchAge(str) {
    return str.match(/Age at time of experience: (.*?)\s/);
  };

var matchViews = function matchViews(str) {
    return str.match(/.*?Views: (.*)/);
  };

var matchTime = function matchTime(str) {
    return str.match(/T\+(.*?):/);
  };

var write = function(data){
  var output = JSON.stringify(data);
  fs.writeFile('data/output.json', output, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
  });

}
