document.getElementById("yxh_music").volume = 0.5;
document.addEventListener('touchstart', function() {
    document.getElementById("yxh_music").play();
})

function 老营销号了() {
    if (document.getElementById('zenmehuishi').checked && !document.getElementById('waiguoxiaoge').checked) {
        var form = document.getElementById('???').elements;

        var 节目 = form.节目.value;
        var 主体 = form.主体.value;
        var 动作 = form.动作.value;
        var Slogan = form.slogan.value;
        var 换个说法 = document.getElementById('换个说法').value;
        if (节目 == '') {
            节目 = form.节目.placeholder;
        }
        if (主体 == '') {
            主体 = form.主体.placeholder;
        }
        if (动作 == '') {
            动作 = form.动作.placeholder;
        }
        if (Slogan == '') {
            Slogan = form.slogan.placeholder;
        }

        document.getElementById('文章').setAttribute('style', 'display:block');
        if (换个说法 == '') {
            document.getElementById('文章').innerText = Slogan + "。Hello，大家好，欢迎来到" +
                节目 + "，今天小编想和大家介绍一下" + 主体 + 动作 + "。" +
                主体 + 动作 + "大家都很熟悉，那么" +
                主体 + 动作 + "究竟是怎么回事呢？下面就让小编带大家一起了解吧。" +
                主体 + 动作 + "，其实就是" + 主体 + 动作 + "，大家可能会很惊讶，为什么" +
                主体 + "会" + 动作 + "呢？但事实就是这样，小编也感到非常惊讶。好啦，以上就是关于" +
                主体 + 动作 + "的全部内容啦，欢迎小伙伴在屏幕下方留言哟。这里是" +
                节目 + "，我们下期再见。";
        } else {
            document.getElementById('文章').innerText = Slogan + "。Hello，大家好，欢迎来到" +
                节目 + "，今天小编想和大家介绍一下" + 主体 + 动作 + "。" +
                主体 + 动作 + "大家都很熟悉，那么" +
                主体 + 动作 + "究竟是怎么回事呢？下面就让小编带大家一起了解吧。" +
                主体 + 动作 + "，其实就是" + 换个说法 + "，大家可能会很惊讶，为什么" +
                主体 + "会" + 动作 + "呢？但事实就是这样，小编也感到非常惊讶。好啦，以上就是关于" +
                主体 + 动作 + "的全部内容啦，欢迎小伙伴在屏幕下方留言哟。这里是" +
                节目 + "，我们下期再见。";
        }
    }
    if (!document.getElementById('zenmehuishi').checked && document.getElementById('waiguoxiaoge').checked) {
        var form = document.getElementById('!!!').elements;

        var 节目 = form.节目.value;
        var 动作 = form.动作.value;
        var 详细描述 = form.详细描述.value;
        var 心情 = form.心情.value;
        var Slogan = form.slogan.value;

        if (节目 == '') {
            节目 = form.节目.placeholder;
        }
        if (动作 == '') {
            动作 = form.动作.placeholder;
        }
        if (详细描述 == '') {
            详细描述 = form.详细描述.placeholder;
        }
        if (心情 == '') {
            心情 = form.心情.placeholder;
        }
        if (Slogan == '') {
            Slogan = form.slogan.placeholder;
        }

        document.getElementById('文章').setAttribute('style', 'display:block');
        document.getElementById('文章').innerText = Slogan + "。Hello，大家好，欢迎收看" +
            节目 + "，近日小编发现，一位外国小哥竟然" +
            动作 + "，网友看了之后都觉得很" +
            心情 + "，到底发生了什么呢？让我们接着往下看吧。大家可以看到那名外国小哥" +
            详细描述 + "，看到这里，你是不是也觉得很" +
            心情 + "呢？好了，这期视频到这里就结束了，这里是" +
            节目 + "，喜欢的小伙伴们可以点个关注，在评论区说说你的想法吧。这里是" +
            节目 + "，我们下期再见。";
    }
}

function doTTS() {
    document.getElementById("yxh_music").volume = 0.15;
    var ttsDiv = document.getElementById('bdtts_div_id');
    var ttsAudio = document.getElementById('tts_autio_id');
    var ttsText = document.getElementById('文章').innerText;

    ttsDiv.removeChild(ttsAudio);
    var au1 = '<audio id="tts_autio_id" autoplay="autoplay">';
    var sss = '<source id="tts_source_id" src="http://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=7&text=' + ttsText + '" type="audio/mpeg">';
    var eee = '<embed id="tts_embed_id" height="0" width="0" src="">';
    var au2 = '</audio>';
    ttsDiv.innerHTML = au1 + sss + eee + au2;
    ttsAudio = document.getElementById('tts_autio_id');
    ttsAudio.play();
    ttsAudio.onended = function() {
        document.getElementById("yxh_music").volume = 0.5;
    };
}

function 怎么回事() {
    document.getElementById('zmhs').setAttribute('style', 'display:contents');
    document.getElementById('wgxg').setAttribute('style', 'display:none');
}

function 外国小哥() {
    document.getElementById('zmhs').setAttribute('style', 'display:none');
    document.getElementById('wgxg').setAttribute('style', 'display:contents');
}