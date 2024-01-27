
$(document).ready(function () {

    timeouts = [];
    loadSettings();
    const audioModeBeg = detectAudioMode();
    adaptControlsToAudioMode(audioModeBeg);
    request = undefined;
    repeatMode = false;
    dominionsLogic();
    literalMode = false;

    function getLangsWithChromeAudio()
    {
        return ["es","pt","fr","it","en","de","ru","hi","zh-CN","id","ja","ko","pl","nl"];
    }

    function detectAudioMode()
    {
        let audioMod = localStorage.audioMode;
        if (audioMod == undefined) audioMod = 'gtrans';
        let langsWithChromeAudio = getLangsWithChromeAudio();
        let langsWithGtransAudio =  ['ar','af','de','es','ca','en','pt','it','ro','en',
        'de','tl','bg','bs','hr','sr','tr','zh-CN','ko','ja',
        'et','fr','el','he','hi','id','lv','ml','ms',
        'nl','pl','ru','sw','th','uk','ur','vi'];
        let isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        let language1 = localStorage.language1;
        let language2 = localStorage.language2;

        if (audioMod === 'chrome' && langsWithChromeAudio.includes(language1) && langsWithChromeAudio.includes(language2) && isChrome) {
            audioMod= 'chrome';
        } else if (audioMod === 'gtrans' && langsWithGtransAudio.includes(language1) && langsWithGtransAudio.includes(language2)) {
            audioMod = 'gtrans';
        } else {
            audioMod = 'no';
        }

        return audioMod;
    }

    function adaptControlsToAudioMode(audioMode)
    {
        if (audioMode === 'chrome') {
            $('#chrome_tts_box').show();
        }
    
        if (audioMode === 'gtrans') {
            $('#chrome_tts_box').hide();
        }
    
        if (audioMode === 'no') {
            $('#chrome_tts_box').hide();
        }
    }

    //global variables for audio
    var synth = window.speechSynthesis;
    var voices = [];
    var langVoices = ["es-US","pt-BR","fr-FR","it-IT","en-US","de-DE","ru-RU","hi-IN","zh-CN","id-ID","ja-JP","ko-KR","pl-PL","nl-NL"];

    $('.transition-radio-group').hide();
    $('#transition-box-1').hide();

    //add event for pressing keys
    $(document).keypress(function (e)
    {
        let code = e.keyCode || e.which;

        if (code == 102) {
            $('#btn_next').click();
        }

    });

    $(document).ajaxStart(function ()
    {
        $("#loading").show();
        $('#flashcards-container').hide();
    }).ajaxStop(function ()
    {
        $("#loading").hide();
        $('#flashcards-container').show();
    }).ajaxError(function ()
    {
        $("#loading").hide();
        $('#flashcards-container').show();
    });

    function loadSettings()
    {

        localStorage.dominionEs = '-1';
        localStorage.dominionEn = '-1';
        localStorage.selectedDominion = '';
        literalMode = false;

        if (localStorage.allTransitionsAutomatic && localStorage.allTransitionsAutomatic == 1) {
            $('#allTransitionsAutomatic').prop('checked', true);
        } else if (localStorage.allTransitionsAutomatic && localStorage.allTransitionsAutomatic == 0) {
            $('#allTransitionsAutomatic').prop('checked', false);
        } else {
            $('#allTransitionsAutomatic').prop('checked', true);
        }

        var params = ["language1", "language2", "flashcardsNum", "autSpeed1", "autSpeed2","trans12Speed", "transpSpeed", "ttsSpeedSrc", 
        "ttsSpeedTgt", "audioMode"];
        var defaults = ["en", "es", "3", "71.42", "85.70", "2", "4", "1", "1", "gtrans"];

        for (let i = 0; i < params.length; i++) {

            if (localStorage.getItem(params[i])) {
                $('#' + params[i]).val(localStorage.getItem(params[i]));
            } else {
                $('#' + params[i]).val(defaults[i]);
            }
        }

        params = ["trans12", "transp"];
        defaults = ["seconds", "seconds"];

        for (let i = 0; i < params.length; i++) {

            if (localStorage.getItem(params[i])) {
                let titleParam = localStorage.getItem(params[i])[0].toUpperCase() +
                    localStorage.getItem(params[i]).slice(1);

                $('#' + params[i] + titleParam).prop('checked', true);
            } else {
                $('#' + params[i] + "Seconds").prop('checked', true);
            }
        }

        if (localStorage.getItem("transMode")) {
            $('#transMode' + capitalizeFirstLetter(localStorage.getItem("transMode"))).prop('checked', true);
        } else {
            $('#transModeAuto').prop('checked', true);
        }

        if (localStorage.getItem("audioMode")) {
            $('#audioMode' + capitalizeFirstLetter(localStorage.getItem("audioMode"))).prop('checked', true);
        } else {
            $('#audioModeGtrans').prop('checked', true);
        }

        if (localStorage.getItem('dominionMode')) {
            $("input[name=r_dominion_mode][value=" + localStorage.getItem('dominionMode') + "]").prop('checked', true);
        } else {
            $("input[name=r_dominion_mode][value=none]").prop('checked', true);
        }

        if (localStorage.getItem('cb_repeat') && localStorage.getItem('cb_repeat') == 1) {
            $('#cb_repeat').prop('checked', true);
        } else {
            $('#cb_repeat').prop('checked', false);
        }

        let audioMode = detectAudioMode();
        adaptControlsToAudioMode(audioMode);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function sortLanguages(arr)
    {
        arr.sort(function (a, b)
        {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        });
        return arr;
    }

    function getLanguageName(googleCode)
    {
        var languages = JSON.parse($('#allLanguages').val());

        for (let i = 0; i < languages.length; i++) {
            if (languages[i].goo == googleCode) {
                return languages[i].name;
            }
        }

        return "unnamed";
    }

    function notify(text, kind)
    {
        $.notify({
            message: text
        },
                {
                    type: kind,
                    z_index: 1100
                });
    }

    function validates()
    {
        let validates = true;
        let errorMessage = "";
        let automatic = $('#allTransitionsAutomatic').prop('checked');

        if (!automatic) {
            let transitionBetweenFlashcards = $('input[name=trans12]:checked').val();
            let transitionBetweenPairs = $('input[name=transp]:checked').val();
            let TBFSeconds = $('#trans12Speed').val();
            let TBPSeconds = $('#transpSpeed').val();

            if (transitionBetweenFlashcards == "seconds" && transitionBetweenPairs == "seconds" && TBPSeconds <= TBFSeconds) {
                validates = false;
                errorMessage += "The seconds for transition between pairs must be greater than the seconds for transition between flashcards\n";
            }
        }

        let numFlashcards = parseInt($('#flashcardsNum').val());
        let isGtransAudioMode = $('#audioModeGtrans').prop('checked');
        let maxFlaschards = 20;

        if (isGtransAudioMode) {
            maxFlaschards = 5;
        }

        if (numFlashcards < 1 || numFlashcards > maxFlaschards) {
            validates = false;
            errorMessage += `The number of flashcard pairs must be a number between 1 and ${maxFlashcards}\n`;
        }

        let language1 = $('#language1').val();
        let language2 = $('#language2').val();

        if (language1 === language2) {
            validates = false;
            errorMessage += "You cannot select the same source and target language\n";
        }

        return {"validates": validates, "errorMessage": errorMessage};
    }

    //standardized apostrophe and quotes (otherwise it causes an error in speech synthesis)
    function sanitizeApostrophe(text)
    {
    	let sign = "'";
        let signHtml = "&#39;";
        let quotes = "&#34;";
    	let re = new RegExp(sign, "g");
        let re2 = new RegExp(signHtml, "g");
        let re3 = new RegExp(quotes, "g");
        text = text.replace(re, "’");
        text = text.replace(re2, "’");
        text = text.replace(re3, '"');
        return text;
    }

    //populate selects
    $.ajax(
    {
        url: "get_languages",
        type: "POST",
        cache: false,
        dataType: "json",
        success: function (languages) 
        {
            languages = sortLanguages(languages);
            let html = "";
            
            for (let i = 0; i < languages.length; i++) {
                let language = languages[i];
                html += "<option value='" + language.goo + "'>" + language.name + "</option>";
            }

            $("#language1").html(html);
            $("#language2").html(html);
            $('#language1').val("en");
            $('#language2').val("es");
            $("#allLanguages").val(JSON.stringify(languages));

            if (localStorage.language1) {
              $('#language1').val(localStorage.language1);
              $('#language2').val(localStorage.language2);
            } else {
              $('#language1').val("en");
              $('#language2').val("es");
              localStorage.language1 = "en";
              localStorage.language2 = "en";
            }
        }
    });

    $.ajax(
        {
            url: "fill_dominions",
            type: "POST",
            cache: false,
            dataType: "json",
            success: function (dominions) 
            {
                let html = "<option value='-1' selected>--</option>";
                
                for (let i = 0; i < dominions.en.length; i++) {
                    let dominion = dominions.en[i];
                    html += "<option value='" + dominion.slug + "'>" + dominion.emoji + ' ' + dominion.name + "</option>";
                }

                $('#dominions_en').html(html);
    
                html = "<option value='-1' selected>--</option>";
                
                for (let i = 0; i < dominions.es.length; i++) {
                    let dominion = dominions.es[i];
                    html += "<option value='" + dominion.slug + "'>" + dominion.emoji + ' ' + dominion.name + "</option>";
                }

                $('#dominions_es').html(html);

                $('#all_dominions_en').val(JSON.stringify(dominions.en));
                $('#all_dominions_es').val(JSON.stringify(dominions.es));
            }
        });

    $('#language1').change(function ()
    {
        localStorage.language1 = $('#language1').val();
        let audioMode = detectAudioMode();
        adaptControlsToAudioMode(audioMode);
        dominionsLogic();
    });

    $('#language2').change(function ()
    {
        localStorage.language2 = $('#language2').val();
        let audioMode = detectAudioMode();
        adaptControlsToAudioMode(audioMode);
    });

    $('#flashcardsNum').mouseup(function ()
    {
        localStorage.flashcardsNum = $('#flashcardsNum').val();
    });

    $('#flashcardsNum').keyup(function ()
    {
        localStorage.flashcardsNum = $('#flashcardsNum').val();
    });

    $('#autSpeed1').mouseup(function ()
    {
        localStorage.autSpeed1 = $('#autSpeed1').val();
    });

    $('#autSpeed1').keyup(function ()
    {
        localStorage.autSpeed1 = $('#autSpeed1').val();
    });

    $('#autSpeed2').mouseup(function ()
    {
        localStorage.autSpeed2 = $('#autSpeed2').val();
    });

    $('#autSpeed2').keyup(function ()
    {
        localStorage.autSpeed2 = $('#autSpeed2').val();
    });

    $('#trans12Speed').mouseup(function ()
    {
        localStorage.trans12Speed = $('#trans12Speed').val();
    });

    $('#trans12Speed').keyup(function ()
    {
        localStorage.trans12Speed = $('#trans12Speed').val();
    });

    $('#transpSpeed').mouseup(function ()
    {
        localStorage.transpSpeed = $('#transpSpeed').val();
    });

    $('#transpSpeed').keyup(function ()
    {
        localStorage.transpSpeed = $('#transpSpeed').val();
    });

    $('input:radio[name="trans12"]').change(function ()
    {
        localStorage.trans12 = $('input[name=trans12]:checked').val();
    });

    $('input:radio[name="transp"]').change(function ()
    {
        localStorage.transp = $('input[name=transp]:checked').val();
    });

    $('input:radio[name="transMode"]').change(function ()
    {
        localStorage.transMode = $('input[name=transMode]:checked').val();
    });

    $('input:radio[name="audioMode"]').change(function ()
    {
        localStorage.audioMode = $('input[name=audioMode]:checked').val();
        let audioMode = detectAudioMode();
        adaptControlsToAudioMode(audioMode);
    });

    $('#ttsSpeedSrc').mouseup(function ()
    {
        localStorage.ttsSpeedSrc = $('#ttsSpeedSrc').val();
    });

    $('#ttsSpeedSrc').keyup(function ()
    {
        localStorage.ttsSpeedSrc = $('#ttsSpeedSrc').val();
    });

    $('#ttsSpeedTgt').mouseup(function ()
    {
        localStorage.ttsSpeedTgt = $('#ttsSpeedTgt').val();
    });

    $('#ttsSpeedTgt').keyup(function ()
    {
        localStorage.ttsSpeedTgt = $('#ttsSpeedTgt').val();
    });

    $('#dominions_en').change(function()
    {
        localStorage.dominionEn = $('#dominions_en').val();
    });

    $('#dominions_es').change(function()
    {
        localStorage.dominionEs = $('#dominions_es').val();
    });

    $('#cb_repeat').change(function ()
    {
        if ($('#cb_repeat').is(':checked')) {
            localStorage.cb_repeat = 1;
        } else {
            localStorage.cb_repeat = 0;
        }
    });

    $('input:radio[name="r_dominion_mode"]').change(function ()
    {
        localStorage.dominionMode = $('input[name=r_dominion_mode]:checked').val();
    });

    function showFlashcards(sentencePairs)
    {
        let audioMode = detectAudioMode();

        if (audioMode === 'no') {
            showFlashcardsWithNoTts(sentencePairs);
        }

        if (audioMode === 'chrome') {
            showFlashcardsWithChromeTts(sentencePairs);
        }

        if (audioMode === 'gtrans') {
            showFlashcardsWithGtransTts(sentencePairs);
        }
    }

    function showFlashcardsWithNoTts(sentencePairs)
    {
        let automatic = $('#allTransitionsAutomatic').prop('checked');
        let automaticSpeed1 = $('#autSpeed1').val();
        let automaticSpeed2 = $('#autSpeed2').val();
        let transitionBetweenFlashcards = $('input[name=trans12]:checked').val();
        let transitionBetweenPairs = $('input[name=transp]:checked').val();
        let TBFSeconds = $('#trans12Speed').val();
        let TBPSeconds = $('#transpSpeed').val();
        let totalTime = (TBPSeconds * 1000 * (sentencePairs.length + 1) + TBFSeconds * 1000);

        if (automatic) {
            totalTime = 0;
        }

        $('#btn_stop').click();
        $('#btn_start').prop('disabled', true);

        if (automatic) {
              $('#btn_next').prop('disabled', true);
              $('#transition-box-1').hide();

              let transitionsBetweenFlashcards = [];
              let transitionsBetweenPairs = [0];
              let accumulatedTime = 0;

              for (let i = 0; i < sentencePairs.length; i++) {
                  let sentencePair = sentencePairs[i];
                  let transitionBF = Math.ceil(automaticSpeed1 * sentencePair.src_sentence.length);

                  //set a minimum time
                  if (transitionBF < 600) {
                      transitionBF = 600;
                  }

                  accumulatedTime += transitionBF;
                  transitionsBetweenFlashcards.push(accumulatedTime);

                  let transitionBP = Math.ceil(automaticSpeed2 * sentencePair.tgt_sentence.length);

                  if (transitionBP < 600) {
                      transitionBP = 600;
                  }

                  accumulatedTime += transitionBP;
                  transitionsBetweenPairs.push(accumulatedTime);

                  totalTime += transitionBF + transitionBP;
              }

              for (var i = 0; i < sentencePairs.length; i++) {

                  let sentencePair = sentencePairs[i];

                  eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePair.src_sentence) +
                  "','" + escape(sentencePair.src_rom) + "','left-flashcard')}," + (transitionsBetweenPairs[i]) + "));");
                  eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePair.tgt_sentence) +
                  "','" + escape(sentencePair.tgt_rom) + "','right-flashcard')}," + (transitionsBetweenFlashcards[i]) + "));");

                  if (i < (sentencePairs.length - 1)) {
                      eval("timeouts.push(setTimeout(function(){showFlashcard('','','right-flashcard')}," + (transitionsBetweenPairs[i + 1]) + "));");
                  }
              }

              timeouts.push(setTimeout(function ()
              {
                  normalize()
              }, totalTime));
        } else {
            if (transitionBetweenPairs == "seconds" && (transitionBetweenFlashcards == "seconds" || transitionBetweenFlashcards == "instantly")) {
                
                if (transitionBetweenFlashcards == "instantly") {
                    TBFSeconds = 0;
                }

                $('#btn_next').prop('disabled', true);
                $('#transition-box-1').hide();

                for (let i = 0; i < sentencePairs.length; i++) {
                    let sentencePair = sentencePairs[i];
                    eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePair.src_sentence) + "','" + escape(sentencePair.src_rom) + "','left-flashcard')}," + ((TBPSeconds) * i * 1000) + "));");
                    eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePair.tgt_sentence) + "','" + escape(sentencePair.tgt_rom) + "','right-flashcard')}," + (((TBPSeconds) * i * 1000) + TBFSeconds * 1000) + "));");
                    eval("timeouts.push(setTimeout(function(){showFlashcard('','','right-flashcard')}," + (((TBPSeconds) * i * 1000) + TBPSeconds * 1000) + "));");
                }
                timeouts.push(setTimeout(function ()
                {
                    normalize()
                }, totalTime));

            }

            if (transitionBetweenPairs == "button" && transitionBetweenFlashcards == "button") {

                $('#btn_next').prop('disabled', false);
                $('#transition-box-1').show();

                let nextPair = 0;
                nextPlace = "left-flashcard";

                $('#btn_next').click(function (e)
                {
                    e.preventDefault();

                    if (nextPair >= sentencePairs.length) {
                        normalize();

                    } else {
                        if (nextPlace == "left-flashcard") {
                            showFlashcard(escape(sentencePairs[nextPair].src_sentence), escape(sentencePairs[nextPair].src_rom),'left-flashcard');
                            $('#right-flashcard').html('');
                        } else {
                            showFlashcard(escape(sentencePairs[nextPair].tgt_sentence), escape(sentencePairs[nextPair].tgt_rom), 'right-flashcard');
                            nextPair++;
                        }

                        nextPlace = changePlace();
                    }

                });

                $('#btn_next').click();
            }

            if (transitionBetweenPairs == "button" && transitionBetweenFlashcards == "instantly") {

                $('#btn_next').prop('disabled', false);
                $('#transition-box-1').show();
                nextPair = 0;

                $('#btn_next').click(function (e)
                {
                    e.preventDefault();
                    if (nextPair >= sentencePairs.length) {
                        $('#btn_stop').click();
                    } else {
                        showFlashcard(escape(sentencePairs[nextPair].src_sentence), escape(sentencePairs[nextPair].src_rom), 'left-flashcard');
                        showFlashcard(escape(sentencePairs[nextPair].tgt_sentence), escape(sentencePairs[nextPair].tgt_rom), 'right-flashcard');
                        nextPair++;
                    }
                });

                $('#btn_next').click();
            }

            if (transitionBetweenPairs == "button" && transitionBetweenFlashcards == "seconds") {

                $('#btn_next').prop('disabled', false);
                $('#transition-box-1').show();
                nextPair = 0;

                $('#btn_next').click(function (e)
                {
                    e.preventDefault();

                    if (nextPair >= sentencePairs.length) {
                        normalize();
                    } else {
                        for (var i = 0; i < timeouts.length; i++) {
                            clearTimeout(timeouts[i]);
                        }

                        timeouts = [];
                        showFlashcard(escape(sentencePairs[nextPair].src_sentence), escape(sentencePairs[nextPair].src_rom), 'left-flashcard');
                        $('#right-flashcard').html('');
                        eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePairs[nextPair].tgt_sentence) + "','" + escape(sentencePairs[nextPair].tgt_rom) + "','right-flashcard')}," + (TBFSeconds * 1000) + "));");
                        nextPair++;
                    }

                });
                $('#btn_next').click();
            }

            if (transitionBetweenPairs == "seconds" && transitionBetweenFlashcards == "button") {

                nextPair = -1;

                for (var i = 0; i < sentencePairs.length; i++) {
                    $('#btn_next').prop('disabled', false);
                    $('#transition-box-1').show();
                    eval("timeouts.push(setTimeout(function(){showFlashcard('" + escape(sentencePairs[i].src_sentence) + "','" + escape(sentencePairs[i].src_rom) + "','left-flashcard'),nextPair++}," + ((TBPSeconds) * i * 1000) + "));");
                    eval("timeouts.push(setTimeout(function(){showFlashcard('','','right-flashcard')}," + (((TBPSeconds) * i * 1000) + TBPSeconds * 1000) + "));");
                }

                timeouts.push(setTimeout(function ()
                {
                    normalize()
                }, totalTime));


                $('#btn_next').click(function (e)
                {
                    e.preventDefault();

                    if (nextPair >= 0) {
                        showFlashcard(escape(sentencePairs[nextPair].tgt_sentence), escape(sentencePairs[nextPair].tgt_rom) , 'right-flashcard');
                    }

                });

            }
        }
    }
    
    function showFlashcardsWithChromeTts(sentencePairs)
    {
        $('#btn_next').prop('disabled', false);
        let nextPair = 0;
        nextPlace = "left-flashcard";

        $('#btn_next').click(function (e)
        {
            e.preventDefault();

            if (nextPair >= sentencePairs.length) {
                normalize();
            } else {
                if (nextPlace == "left-flashcard") {
                      showFlashcard(escape(sentencePairs[nextPair].src_sentence), escape(sentencePairs[nextPair].src_rom), 'left-flashcard');
                      $('#right-flashcard').html('');
                } else {
                    showFlashcard(escape(sentencePairs[nextPair].tgt_sentence), escape(sentencePairs[nextPair].tgt_rom), 'right-flashcard');
                    nextPair++;
                }
                nextPlace = changePlace();
            }
         });

         $('#btn_next').click();

    }

    function showFlashcardsWithGtransTts(sentencePairs)
    {
		speakWithGoogleSpeech(sentencePairs, 0);
    }

    function speakWithChromeTts(language, txt, speedRate) {
        voices = synth.getVoices();
        let u = new SpeechSynthesisUtterance(txt);

        if (speedRate==undefined){
          speedRate = 1;
        }

        if (speedRate > 4.0) {
          speedRate = 4.0;
        }

        if (speedRate < 0.25) {
          speedRate = 0.25;
        }

        u.rate = speedRate;

        for (i=0; i < voices.length; i++) {
           if (voices[i].lang == language) {
               u.voice = voices[i];
               break;
           }
        }

        synth.speak(u);
        u.onend = function(event) 
        {
            $('#btn_next').click();
        }
   }

   function speakWithGoogleSpeech(chunks, n)
   {
       showFlashcard(chunks[n]['src_sentence'], chunks[n]['src_rom'], 'left-flashcard');
       showFlashcard(chunks[n]['tgt_sentence'], chunks[n]['tgt_rom'], 'right-flashcard');

       let srcLanguage = localStorage.language1;
       let tgtLanguage = localStorage.language2;
       let srcLanguageSpeed = 1.2;
       let tgtLanguageSpeed = 1.2;

       if (srcLanguage === 'es' || srcLanguage === 'en') {
          srcLanguageSpeed = 1.5;
       }

       if (tgtLanguage === 'es' || tgtLanguage === 'en') {
          tgtLanguageSpeed = 1.5;
       }

       let audio_orig = new Audio(chunks[n].audio_path_orig);
       audio_orig.playbackRate = srcLanguageSpeed;
       let audio_trans = new Audio(chunks[n].audio_path_trans); 
       audio_trans.playbackRate = tgtLanguageSpeed;
       audio_orig.addEventListener("ended", function() {
           audio_trans.play();
       });
       audio_trans.addEventListener("ended", function() {
           if (n==chunks.length-1) {
           normalize();
       }else{
           speakWithGoogleSpeech(chunks, n+1);
       }
       });
       audio_orig.play();
   }

    function showFlashcard(txt, translit, whichFlashcard)
    {
        let html = "<div class='sentence'>" + txt + "</div>";

        if (translit !== '') {
          html += "<div class='transliteration'>" + translit + "</div>";
        }

        $('#' + whichFlashcard).html(html);

        let audioMode = detectAudioMode();

        if (audioMode === 'chrome') {

            let language1 = $('#language1').val();
            let language2 = $('#language2').val();
            let language = '';
            let speed = 1;

            if (whichFlashcard == 'left-flashcard') {
                language = language1;
                speed = $('#ttsSpeedSrc').val();
            } else {
                language = language2;
                speed = $('#ttsSpeedTgt').val();
            }

            let languageChr = langVoices[getLangsWithChromeAudio().indexOf(language)];

            speakWithChromeTts(languageChr, sanitizeApostrophe(txt), speed);
        }

    }

    function normalize()
    {
        $('#left-flashcard').html('');
        $('#right-flashcard').html('');
        $('#btn_start').prop('disabled', false);
        $('#transition-box-1').hide();
        $('#btn_next').prop('disabled', true);
        $('#btn_next').unbind();
    }

    function escape(txt)
    {
        if (txt == '' || txt == undefined) {
            return ''
        }

        txt = txt.replace(/\'/g, "&#39;");
        txt = txt.replace(/\"/g, '&#34;');
        txt = txt.replace(/\</g, "&lt;");
        txt = txt.replace(/\</g, "&gt;");

        return txt;
    }

    function changePlace()
    {
        if (nextPlace == "left-flashcard") {
            return "right-flashcard";
        }
        else {
            return "left-flashcard";
        }
    }

    function showNoSentencesMessage()
    {
        notify('There are no sentence pairs for those criteria.','warning');
    }

    $('#allTransitionsAutomatic').click(function (e)
    {
        if ($(this).prop('checked')) {
            localStorage.allTransitionsAutomatic = 1;
            $('.transition-radio-group').hide();
            $('#chrome_tts_box').show();
        } else {
            localStorage.allTransitionsAutomatic = 0;
            $('.transition-radio-group').show();
            $('#chrome_tts_box').hide();
        }
    });

    $('#btn_stop').click(function (e)
    {
        e.preventDefault();

        for (let i = 0; i < timeouts.length; i++) {
            clearTimeout(timeouts[i]);
        }

        timeouts = [];

        normalize();
    });

    $('#btn_start').click(function (e)
    {
        e.preventDefault();

        if ($('#collapseOne').is(":visible")) {
          $('#btn-collapse').click();
        }

        $('.flashcard').html('');

        for (let i = 0; i < timeouts.length; i++) {
            clearTimeout(timeouts[i]);
        }

        timeouts = [];

        let validation = validates();

        if (!validation.validates) {
            notify(validation.errorMessage, 'warning');

            return false;
        }

        let language1 = $('#language1').val();
        let language2 = $('#language2').val();
        let numFlashcards = parseInt($('#flashcardsNum').val());
        let includeWords = includeWordsLogic();
        let transMode = $('input[name="transMode"]:checked').val();
        let audioMode = detectAudioMode();

        if (includeWords === '') {
            includeWords = '_';
        }

        //get sentence pairs
        let previousSentences = JSON.parse($('#previousSentences').val());

        if (repeatMode) {
            repeatMode = false;
            if (previousSentences.length === 0) {
                showNoSentencesMessage();
                return false;
            }
            showFlashcards(previousSentences);
            return true;
        }

        if (!repeatMode && !literalMode) {
            request = $.ajax(
            {
                url: `api/random_sentences/${language1}/${language2}/${numFlashcards}/${transMode}/${audioMode}/${includeWords}`,
                type: "GET",
                cache: false,
                dataType: "json",
                success: function (sentencePairs) {
                if (sentencePairs.length > 0) {

                    if ($('#cb_repeat').is(':checked')) {
                        newSentencePairs = [];
                        for (let i = 0; i < sentencePairs.length; i ++) {
                            for (let j = 0; j < 2; j ++) {
                                newSentencePairs.push(sentencePairs[i]);
                            }
                        }
                        sentencePairs = newSentencePairs;
                    }

                    $('#previousSentences').val(JSON.stringify(sentencePairs));
                    showFlashcards(sentencePairs);
                } else {
                    $('#previousSentences').val('[]');
                    showNoSentencesMessage();
                }
                },
                error: function (xhr, status, error) {
                    notify(xhr.responseText, 'error');
                    return false;
                }
            });
        }

        if (literalMode) {
            let sentencesStr = $('#includeWords').val();
            let sentences = getLiteralSentences(sentencesStr);
            request = $.ajax(
                {
                    url: 'api/literal_sentences',
                    type: "POST",
                    cache: false,
                    dataType: "json",
                    data: {"sentences": JSON.stringify(sentences), "src_lang": language1, "tgt_lang": language2, "audio_mode": audioMode},
                    success: function (sentencePairs) {
                    if (sentencePairs.length > 0) {
    
                        if ($('#cb_repeat').is(':checked')) {
                            newSentencePairs = [];
                            for (let i = 0; i < sentencePairs.length; i ++) {
                                for (let j = 0; j < 2; j ++) {
                                    newSentencePairs.push(sentencePairs[i]);
                                }
                            }
                            sentencePairs = newSentencePairs;
                        }
    
                        $('#previousSentences').val(JSON.stringify(sentencePairs));
                        showFlashcards(sentencePairs);
                    } else {
                        $('#previousSentences').val('[]');
                        showNoSentencesMessage();
                    }
                    },
                    error: function (xhr, status, error) {
                        notify(xhr.responseText, 'error');
                        return false;
                    }
                });
            }

    });

    if ($('#allTransitionsAutomatic').prop('checked') === true) {
        $('.transition-radio-group').hide();
        $('#tts_box').show();
        $('#useTts').prop('checked', true);
    } else {
        $('.transition-radio-group').show();
        $('#tts_box').hide();
        $('#useTts').prop('checked', false);
    }

    $('#btn_repeat').click(function (e)
    {
        repeatMode = true;
        $('#btn_start').click();
    });

    function dominionsLogic()
    {
        $('#dominions_en_cont').hide();
        $('#dominions_es_cont').hide();
        $('#dominion_mode_cont').hide();

        let language1 = localStorage.language1;

        if (language1 === 'es') {
            $('#dominions_es_cont').show();
            $('#dominion_mode_cont').show();
        }

        if (language1 === 'en') {
            $('#dominions_en_cont').show();
            $('#dominion_mode_cont').show();
        }
    }

    function includeWordsLogic() 
    {

        literalMode = false;

        if (repeatMode === true) {
            return;
        }

        let words = $('#includeWords').val();

        if (words.charAt(0) === '*') {
            literalMode = true;
            return;
        }

        let dominionEs = localStorage.dominionEs;
        let dominionEn = localStorage.dominionEn;

        let language1 = localStorage.language1;

        if (language1 === 'es' && dominionEs !== undefined && dominionEs != '-1') {
            words = getRandomWord('es', dominionEs);
        }

        if (language1 === 'en' && dominionEn !== undefined && dominionEn != '-1') {
            words = getRandomWord('en', dominionEn);
        }

        let dominionMode = $('input[name="r_dominion_mode"]:checked').val();

        if (language1 === 'es' && dominionMode === 'rnd_dom') {
            words = getDifferentRandomWordOfSameRandomDominion('es');
        }

        if (language1 === 'en' && dominionMode === 'rnd_dom') {
            words = getDifferentRandomWordOfSameRandomDominion('en');
        }

        if (language1 === 'es' && dominionMode === 'rnd_w') {
            words = getRandomWordOfRandomDominion('es');
        }

        if (language1 === 'en' && dominionMode === 'rnd_w') {
            words = getRandomWordOfRandomDominion('en');
        }

        return words;
    }

    function getRandomWord(lang, dominion)
    {
        let div = 'all_dominions_en';
        
        if (lang === 'es') {
            div = 'all_dominions_es';
        }

        let dominions = JSON.parse($('#' + div).val());

        for (let i=0; i<dominions.length; i++) {
            if (dominions[i].slug === dominion) {
                let word = dominions[i].words[Math.floor(Math.random()*dominions[i].words.length)];

                notify(word, 'info');

                return word;
            }
        }

        return '';
    }

    function getRandomWordOfRandomDominion(lang)
    {
        let div = 'all_dominions_en';
        
        if (lang === 'es') {
            div = 'all_dominions_es';
        }

        let dominions = JSON.parse($('#' + div).val());

        let randomDominion = dominions[Math.floor(Math.random() * dominions.length)];

        let word = randomDominion.words[Math.floor(Math.random()*randomDominion.words.length)];

        notify(`${randomDominion.name} :: ${word}`, 'info');

        return word;
    }

    function getDifferentRandomWordOfSameRandomDominion(lang)
    {
        let div = 'all_dominions_en';
        
        if (lang === 'es') {
            div = 'all_dominions_es';
        }

        let dominions = JSON.parse($('#' + div).val());

        let previousDataText = localStorage.selectedDominion;

        if (previousDataText === '') {
            let randomDominion = dominions[Math.floor(Math.random() * dominions.length)];
            let word = randomDominion.words[Math.floor(Math.random()*randomDominion.words.length)];
            notify(`${randomDominion.name} :: ${word}`, 'info');
            saveInfo(randomDominion, word);
            return word;
        } else {
            let previousData = JSON.parse(previousDataText);
            let randomDominion = previousData;
            let word = randomDominion.words[Math.floor(Math.random()*randomDominion.words.length)];
            saveInfo(randomDominion, word);
            if (previousData.words.length === 1) {
                localStorage.selectedDominion = '';
            }
            notify(word, 'info');
            return word;
        }
    }

    function saveInfo(dominion, word)
    {
        let newWords = [];
        for (let i = 0; i < dominion.words.length; i++) {
            let word_ = dominion.words[i];
            if (word_ != word) {
                newWords.push(word_);
            }
        }
        let newDominion = {'name' : dominion.name, 'words' : newWords};
        localStorage.selectedDominion = JSON.stringify(newDominion);
    }

    function getLiteralSentences(text)
    {
        text = text.replace('. ', ".\n");
        text = text.substring(1);
        text = text.trim();
        let sentences = text.split(/\r?\n|\r|\n/g);
        let newSentences = [];
        for (let i=0; i<sentences.length; i++) {
            let sentence = sentences[i];
            if (sentences !== '') {
                newSentences.push(sentence);
            }
        }
        return newSentences;
    }

    $('#btn-toggle-language').click(function()
    {
        let lang1 = $('#language1').val();
        let lang2 = $('#language2').val();
        $('#language2').val(lang1);
        $('#language1').val(lang2);
        localStorage.language1 = lang2;
        localStorage.language2 = lang1;
        dominionsLogic();
        $('#includeWords').val('');
        $('#dominions_en').val(-1);
        $('#dominions_es').val(-1);
    });
});
