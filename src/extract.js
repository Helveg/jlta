var toLoad = 0;
var hasCollected = 0;
var hasFailed = 0;
var jqxhrArray = [];

console.log("Initialized JLTA")

$(function(){
  console.log("Executing immediate function context")
  $("h1:contains('SEARCH')").attr('id','showtext');
  var $tdiv = $("table").parents("div");
  // Components
  var $btn = $("<a>Extract</a>")
    .attr('id', 'extractBtn')
    .addClass("rds-button")
    .click(extractAll);
  var $filename = $("<input></input>")
    .attr('id','extractFile')
    .attr('type','text')
    .attr('placeholder','Filename...')
    .addClass("rds-input");
  var $download = $("<a>Download</a>")
    .attr("id","downloadLink")
    .css('display', 'none')
    .addClass("rds-button");
  var $myBar = $("<div></div>")
    .attr('id','myBar')
    .append($filename).append($btn).append($download)
    .addClass('rds-bar')
    .insertAfter($tdiv)
    .animate({height: '57px'});

  $tdiv.animate({top: '246px'});

  console.log("Injected components.")

  chrome.storage.local.get('file', function(data) {
    $filename.val(data.file);
  });
})

function extractAll(e){
  console.log("Running ExtractAll.")
  // Init
  $("#showtext").fadeOut(function(){$(this).text("LOADING")}).fadeIn();
  if($("#collector").length == 0) $("body").append($("<span id='collector'></span>").css('display', 'none'));

  // Reset
  toLoad = 0; hasCollected = 0; jqxhrArray.forEach(x=>x.abort()); jqxhrArray = []; $("#collector").data('blob-blocks', []);
  $("#downloadLink").fadeOut(1000);

  // Load
  var topData = getTableData($("table"));
  storeBlobBlock(generateBlobBlock('root', topData));
  for(var i in topData)
  {
    loadRemoteTable(topData[i].name, topData[i].href);
  }
}

function getTableData(table)
{
  return $(table).find("tr").filter(function(){
    return $(this).children("td").length == 2;
  }).map(function(){
    var $tds = $(this).children("td");
    var $left = $($tds[0]).children("a");
    var $right = $($tds[1]);
    return {name: $left.text(), href: $left.attr('href'), val: $right.text()};
  }).get();
}

function getRemoteTableList(table)
{

}

function loadRemoteTable(name, url)
{
  toLoad += 1;
  window.URL = window.URL || window.webkiURL;
  jqxhrArray.push($.ajax({
    url: url.replace('http','https'),
    success: [ function(data){
                  collectRemoteTable(name, data)
                }
             ],
    error: function(){console.log('ajax failed'); hasFailed += 1; btnVis();}
  }));
}

function collectRemoteTable(name, data)
{
  hasCollected += 1;
  var tdata = getTableData($(data).find("table"));
  storeBlobBlock(generateBlobBlock(name, tdata));
  btnVis();
}

function btnVis()
{
  var $txt = $("#showtext").text(hasCollected + "/" + toLoad);
  if(toLoad > 0 && toLoad == (hasFailed + hasCollected))
  {
    $txt.text("DONE").delay(2500).fadeOut(function(){$(this).text("SEARCH")}).fadeIn();
    generateBlob();
  }
}

function storeBlobBlock(block)
{
  $("#collector").data('blob-blocks').push(block);
}

function generateBlob()
{
  var blob = new Blob([$("#collector").data('blob-blocks').join("\n")]);
  var blobURL = window.URL.createObjectURL(blob);
  chrome.storage.local.set({file: $("#extractFile").val()});
  var $dl = $("#downloadLink")
    .attr("href", blobURL)
    .text("Download")
    .attr("download", $("#extractFile").val() + ".csv")
    .fadeIn();
  if(hasFailed > 0) $dl.append(" (" + hasFailed + " errors)");
}

function generateBlobBlock(name, tableData)
{
  return "###" + name + "\n" + tableData.map(x=>x.name + ";" + x.val).join("\n");
}
