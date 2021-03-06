


var Simulator = (function($) {
	//定数
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 130;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 80;
	var TRAINING_SKILL_PTS_MIN = 0;
	var TRAINING_SKILL_PTS_MAX = 8;
	var LEVEL_FOR_TRAINING_MODE = 50;
	var MSP_MIN = 0;
	var MSP_MAX = 10;

	var DATA_JSON_URI = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'dq10skill-data.json';
	
	//データロード
	var allData;
	$.ajaxSetup({async: false});
	$.getJSON(DATA_JSON_URI, function(data) {
		allData = data;
	});
	$.ajaxSetup({async: true});
	
	if(!allData) return null;
	
	var skillLines = allData.skillLines;
	var vocations = allData.vocations;
	var skillPtsGiven = allData.skillPtsGiven;
	var expRequired = allData.expRequired;
	var trainingPts = allData.trainingPts;
	
	//パラメータ格納用
	var skillPts = {};
	var levels = {};
	var trainingSkillPts = {};
	var msp = {}; //マスタースキルポイント

	//パラメータ初期化
	for(var vocation in vocations) {
		skillPts[vocation] = {};
		for(var s = 0; s < vocations[vocation].skillLines.length; s++) {
			var skillLine = vocations[vocation].skillLines[s];
			skillPts[vocation][skillLine] = 0;
		}
		levels[vocation] = LEVEL_MIN;
		trainingSkillPts[vocation] = TRAINING_SKILL_PTS_MIN;
	}
	
	/* メソッド */
	//スキルポイント取得
	function getSkillPt(vocation, skillLine) {
		return skillPts[vocation][skillLine];
	}
	
	//スキルポイント更新：不正値の場合falseを返す
	function updateSkillPt(vocation, skillLine, newValue) {
		var oldValue = skillPts[vocation][skillLine];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		if(totalOfSameSkills(skillLine) - oldValue + newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		skillPts[vocation][skillLine] = newValue;
		return true;
	}
	
	//レベル値取得
	function getLevel(vocation) {
		return levels[vocation];
	}
	
	//レベル値更新
	function updateLevel(vocation, newValue) {
		var oldValue = levels[vocation];
		if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
			return oldValue;
		}
		
		levels[vocation] = newValue;
		return newValue;
	}
	
	//特訓スキルポイント取得
	function getTrainingSkillPt(vocation) {
		return trainingSkillPts[vocation];
	}
	
	//特訓スキルポイント更新
	function updateTrainingSkillPt(vocation, newValue) {
		if(newValue < TRAINING_SKILL_PTS_MIN || newValue > TRAINING_SKILL_PTS_MAX)
			return false;
		
		trainingSkillPts[vocation] = newValue;
		return true;
	}

	//マスタースキルポイント取得
	function getMSP(skillLine) {
		return msp[skillLine] || 0;
	}

	//マスタースキルポイント更新
	function updateMSP(skillLine, newValue) {
		var oldValue = msp[skillLine] || 0;
		if(newValue < MSP_MIN || newValue > MSP_MAX)
			return false;
		if(totalMSP() - oldValue + newValue > MSP_MAX)
			return false;
		if(totalOfSameSkills(skillLine) - oldValue + newValue > SKILL_PTS_MAX)
			return false;

		msp[skillLine] = newValue;
		return true;
	}

	//使用中のマスタースキルポイント合計
	function totalMSP() {
		var total = 0;
		for(var s in msp)
			total += msp[s];

		return total;
	}

	//職業のスキルポイント合計
	function totalSkillPts(vocation) {
		var total = 0;
		for(var skillLine in skillPts[vocation])
			total += skillPts[vocation][skillLine];
		
		return total;
	}
	
	//同スキルのポイント合計
	function totalOfSameSkills(skillLine) {
		var total = 0;
		for(var vocation in skillPts) {
			if(skillPts[vocation][skillLine])
				total += skillPts[vocation][skillLine];
		}
		total += msp[skillLine] || 0;

		return total;
	}
	
	//特定スキルすべてを振り直し（0にセット）
	function clearPtsOfSameSkills(skillLine) {
		for(var vocation in skillPts) {
			if(skillPts[vocation][skillLine])
				updateSkillPt(vocation, skillLine, 0);
		}
		msp[skillLine] = 0;
	}

	//MSPを初期化
	function clearMSP() {
		msp = {};
	}
	
	//すべてのスキルを振り直し（0にセット）
	function clearAllSkills() {
		for(var vocation in skillPts) {
			for(var skillLine in skillPts[vocation]) {
				skillPts[vocation][skillLine] = 0;
			}
		}
		clearMSP();
	}
	
	//職業レベルに対するスキルポイント最大値
	function maxSkillPts(vocation) {
		return skillPtsGiven[levels[vocation]];
	}
	
	//スキルポイント合計に対する必要レベル取得
	function requiredLevel(vocation) {
		var trainingSkillPt = getTrainingSkillPt(vocation);
		var total = totalSkillPts(vocation) - trainingSkillPt;
		
		for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
			if(skillPtsGiven[l] >= total) {
				//特訓スキルポイントが1以上の場合、最低レベル50必要
				if(trainingSkillPt > TRAINING_SKILL_PTS_MIN && l < LEVEL_FOR_TRAINING_MODE)
					return LEVEL_FOR_TRAINING_MODE;
				else
					return l;
			}
		}
		return NaN;
	}
	
	//職業・レベルによる必要経験値
	function requiredExp(vocation, level) {
		return expRequired[vocations[vocation].expTable][level];
	}
	
	//不足経験値
	function requiredExpRemain(vocation) {
		var required = requiredLevel(vocation);
		if(required <= levels[vocation]) return 0;
		var remain = requiredExp(vocation, required) - requiredExp(vocation, levels[vocation]);
		return remain;
	}
	
	//全職業の必要経験値合計
	function totalRequiredExp() {
		var total = 0;
		for(var vocation in vocations) {
			total += requiredExp(vocation, levels[vocation]);
		}
		return total;
	}
	
	//全職業の不足経験値合計
	function totalExpRemain() {
		var total = 0;
		for(var vocation in vocations) {
			total += requiredExpRemain(vocation);
		}
		return total;
	}
	
	//各種パッシブスキルのステータス加算合計
	//ちから      : pow
	//みのまもり  : def
	//きようさ    : dex
	//すばやさ    : spd
	//こうげき魔力: magic
	//かいふく魔力: heal
	//さいだいHP  : maxhp
	//さいだいMP  : maxmp
	//みりょく    : charm
	function totalStatus(status) {
		//スキルカテゴリデータの各スキルから上記プロパティを調べ合計する
		var total = 0;
		var skills;
		for(var skillLine in skillLines) {
			skills = skillLines[skillLine].skills;
			for(var i = 0; i < skills.length; i++) {
				if(totalOfSameSkills(skillLine) < skills[i].pt)
					break;
				
				if(skills[i][status])
					total += skills[i][status];
			}
		}
		
		return total;
	}
	
	//特定のパッシブスキルをすべて取得済みの状態にする
	//ステータスが変動した場合trueを返す
	function presetStatus (status) {
		var returnValue = false;

		for(var vocation in vocations) {
			for(var s = 0; s < vocations[vocation].skillLines.length; s++) {
				var skillLine = vocations[vocation].skillLines[s];

				if(!skillLines[skillLine].unique) continue;

				var skills = skillLines[skillLine].skills;
				for (var i = skills.length - 1; i >= 0; i--) {
					if(skills[i][status] && getSkillPt(vocation, skillLine) < skills[i].pt) {
						updateSkillPt(vocation, skillLine, skills[i].pt);
						returnValue = true;
						break;
					}
				}
			}
		}

		return returnValue;
	}

	//現在のレベルを取得スキルに対する必要レベルにそろえる
	function bringUpLevelToRequired () {
		for(var vocation in vocations) {
			if(getLevel(vocation) < requiredLevel(vocation))
				updateLevel(vocation, requiredLevel(vocation));
		}
	}

	var VOCATIONS_DATA_ORDER = [
		'warrior',       //戦士
		'priest',        //僧侶
		'mage',          //魔法使い
		'martialartist', //武闘家
		'thief',         //盗賊
		'minstrel',      //旅芸人
		'ranger',        //レンジャー
		'paladin',       //パラディン
		'armamentalist', //魔法戦士
		'luminary',      //スーパースター
		'gladiator',     //バトルマスター
		'sage',          //賢者
		'monstermaster', //まもの使い
		'itemmaster'     //どうぐ使い
	];

	function serialize() {
		var serial = '';
		var toByte = String.fromCharCode;

		var vocationCount = VOCATIONS_DATA_ORDER.length;
		//先頭に職業の数を含める
		serial += toByte(vocationCount);

		var skillLine;

		for(var i = 0; i < vocationCount; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];
			serial += toByte(getLevel(vocation));
			serial += toByte(getTrainingSkillPt(vocation));

			for(var s = 0; s < vocations[vocation].skillLines.length; s++) {
				skillLine = vocations[vocation].skillLines[s];
				serial += toByte(getSkillPt(vocation, skillLine));
			}
		}
		//末尾にMSPのスキルラインIDとポイントをペアで格納
		for(sl in msp) {
			if(msp[sl] > 0) {
				serial += toByte(skillLines[sl].id) + toByte(msp[sl]);
			}
		}
		return serial;
	}
	function deserialize(serial) {
		var cur = 0;
		var getData = function() {
			return serial.charCodeAt(cur++);
		};
		
		//先頭に格納されている職業の数を取得
		var vocationCount = getData();

		for(i = 0; i < vocationCount; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];
			var vSkillLines = vocations[vocation].skillLines;

			if(serial.length - cur < 1 + 1 + vSkillLines.length)
				break;

			updateLevel(vocation, getData());
			updateTrainingSkillPt(vocation, getData());

			for(var s = 0; s < vSkillLines.length; s++) {
				updateSkillPt(vocation, vSkillLines[s], getData());
			}
		}
		//末尾にデータがあればMSPとして取得
		while(serial.length - cur >= 2) {
			var skillLineId = getData();
			var skillPt = getData();
			for(var sl in skillLines) {
				if(skillLines[sl].id == skillLineId)
					updateMSP(sl, skillPt);
			}
		}
	}

	function deserializeBit(serial) {
		var BITS_LEVEL = 8; //レベルは8ビット確保
		var BITS_SKILL = 7; //スキルは7ビット
		var BITS_TRAINING = 7; //特訓スキルポイント7ビット
		
		var bitArray = [];
		for(var i = 0; i < serial.length; i++)
			bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));

		//特訓ポイントを含むかどうか: ビット列の長さで判断
		var isIncludingTrainingPts = bitArray.length >= (
			BITS_LEVEL +
			BITS_TRAINING +
			BITS_SKILL * vocations[VOCATIONS_DATA_ORDER[0]].skillLines.length
		) * 10; //1.2VU（特訓モード実装）時点の職業数
		
		var cur = 0;
		for(i = 0; i < VOCATIONS_DATA_ORDER.length; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];

			updateLevel(vocation, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));

			if(isIncludingTrainingPts)
				updateTrainingSkillPt(vocation, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
			else
				updateTrainingSkillPt(vocation, 0);

			for(var s = 0; s < vocations[vocation].skillLines.length; s++) {
				var skillLine = vocations[vocation].skillLines[s];
				updateSkillPt(vocation, skillLine, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
			}
		}

		function bitArrayToNum(bitArray) {
			var num = 0;
			for(var i = 0; i < bitArray.length; i++) {
				num = num << 1 | bitArray[i];
			}
			return num;
		}
		function numToBitArray(num, digits) {
			var bitArray = [];
			for(var i = digits - 1; i >= 0; i--) {
				bitArray.push(num >> i & 1);
			}
			return bitArray;
		}
	}

	//API
	return {
		//メソッド
		getSkillPt: getSkillPt,
		updateSkillPt: updateSkillPt,
		getLevel: getLevel,
		updateLevel: updateLevel,
		getTrainingSkillPt : getTrainingSkillPt,
		updateTrainingSkillPt : updateTrainingSkillPt,
		getMSP: getMSP,
		updateMSP: updateMSP,
		totalMSP: totalMSP,
		totalSkillPts: totalSkillPts,
		totalOfSameSkills: totalOfSameSkills,
		clearPtsOfSameSkills: clearPtsOfSameSkills,
		clearMSP: clearMSP,
		clearAllSkills: clearAllSkills,
		maxSkillPts: maxSkillPts,
		requiredLevel: requiredLevel,
		requiredExp: requiredExp,
		requiredExpRemain: requiredExpRemain,
		totalRequiredExp: totalRequiredExp,
		totalExpRemain: totalExpRemain,
		totalStatus: totalStatus,
		presetStatus: presetStatus,
		bringUpLevelToRequired: bringUpLevelToRequired,
		serialize: serialize,
		deserialize: deserialize,
		deserializeBit: deserializeBit,

		//プロパティ
		skillLines: skillLines,
		vocations: vocations,
		skillPtsGiven: skillPtsGiven,
		expRequired: expRequired,
		trainingPts: trainingPts,
		vocationOrder: allData.vocationOrder,
		
		//定数
		SKILL_PTS_MIN: SKILL_PTS_MIN,
		SKILL_PTS_MAX: SKILL_PTS_MAX,
		LEVEL_MIN: LEVEL_MIN,
		LEVEL_MAX: LEVEL_MAX,
		TRAINING_SKILL_PTS_MIN: TRAINING_SKILL_PTS_MIN,
		TRAINING_SKILL_PTS_MAX: TRAINING_SKILL_PTS_MAX,
		LEVEL_FOR_TRAINING_MODE: LEVEL_FOR_TRAINING_MODE,
		MSP_MIN: MSP_MIN,
		MSP_MAX: MSP_MAX
	};
})(jQuery);

var SimulatorUI = (function($) {
	var CLASSNAME_SKILL_ENABLED = 'enabled';
	var CLASSNAME_ERROR = 'error';
	
	var sim = Simulator;

	var $ptConsole, $lvConsole, $trainingPtConsole;
	
	var mspMode = false; //MSP編集モードフラグ

	function refreshAll() {
		refreshAllVocationInfo();
		for(var skillLine in sim.skillLines) {
			refreshSkillList(skillLine);
		}
		refreshTotalRequiredExp();
		refreshTotalExpRemain();
		refreshTotalPassive();
		refreshControls();
		refreshSaveUrl();
	}
	
	function refreshVocationInfo(vocation) {
		var currentLevel = sim.getLevel(vocation);
		var requiredLevel = sim.requiredLevel(vocation);
		
		//見出し中のレベル数値
		$('#' + vocation + ' .lv_h2').text(currentLevel);
		var $levelH2 = $('#' + vocation + ' h2');
		
		//必要経験値
		$('#' + vocation + ' .exp').text(numToFormedStr(sim.requiredExp(vocation, currentLevel)));
		
		//スキルポイント 残り / 最大値
		var maxSkillPts = sim.maxSkillPts(vocation);
		var additionalSkillPts = sim.getTrainingSkillPt(vocation);
		var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocation);
		var $skillPtsText = $('#' + vocation + ' .pts');
		$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
		$('#training-' + vocation).text(additionalSkillPts);
		
		//Lv不足の処理
		var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
		
		$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
		$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
		$('#' + vocation + ' .error').toggle(isLevelError);
		if(isLevelError) {
			$('#' + vocation + ' .req_lv').text(numToFormedStr(requiredLevel));
			$('#' + vocation + ' .exp_remain').text(numToFormedStr(sim.requiredExpRemain(vocation)));
		}
	}
	
	function refreshAllVocationInfo() {
		for(var vocation in sim.vocations) {
			refreshVocationInfo(vocation);
		}
	}
	
	function refreshTotalRequiredExp() {
		$('#total_exp').text(numToFormedStr(sim.totalRequiredExp()));
	}
	
	function refreshTotalExpRemain() {
		var totalExpRemain = sim.totalExpRemain();
		$('#total_exp_remain, #total_exp_remain_label').toggleClass(CLASSNAME_ERROR, totalExpRemain > 0);
		$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
	}
	
	function refreshTotalPassive() {
		var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
		for(var i = 0; i < status.length; i++) {
			$('#total_' + status[i]).text(sim.totalStatus(status[i]));
		}
		$('#msp_remain').text((sim.MSP_MAX - sim.totalMSP()).toString() + 'P');
	}
	
	function refreshSkillList(skillLine) {
		$('tr[class^=' + skillLine + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
		var totalOfSkill = sim.totalOfSameSkills(skillLine);
		var skills = sim.skillLines[skillLine].skills;
		for(var s = 0; s < skills.length; s++) {
			if(totalOfSkill < skills[s].pt)
				break;
			
			$('.' + skillLine + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
		}
		$('.' + skillLine + ' .skill_total').text(totalOfSkill);

		var msp = sim.getMSP(skillLine);
		if(msp > 0)
			$('<span>(' + msp.toString() + ')</span>')
				.addClass('msp')
				.appendTo('.' + skillLine + ' .skill_total');
	}
	
	function refreshControls() {
		for(var vocation in sim.vocations) {
			for(var s = 0; s < sim.vocations[vocation].skillLines.length; s++) {
				var skillLine = sim.vocations[vocation].skillLines[s];
				refreshCurrentSkillPt(vocation, skillLine);
			}
		}
	}
	
	function refreshCurrentSkillPt(vocation, skillLine) {
		$('#' + vocation + ' .' + skillLine + ' .skill_current').text(sim.getSkillPt(vocation, skillLine));
	}

	function refreshSaveUrl() {
		var url = window.location.href.replace(window.location.search, "") + '?' +
			Base64.btoa(RawDeflate.deflate(sim.serialize()));

		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 現在のスキル構成:',
			hashtags: 'DQ10, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		};
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
	}
	
	function selectSkillLine(skillLine) {
		$('.skill_table').removeClass('selected');
		$('.' + skillLine).addClass('selected');
	}

	function toggleMspMode(mode) {
		mspMode = mode;
		$('body').toggleClass('msp', mode);
	}

	function getCurrentVocation(currentNode) {
		return $(currentNode).parents('.class_group').attr('id');
	}

	function getCurrentSkillLine(currentNode) {
		return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
	}

	function setup() {
		for(var i = 0; i < setupFunctions.length; i++) {
			setupFunctions[i]();
		}
		refreshAll();
	}
	
	var setupFunctions = [
		//レベル選択セレクトボックス項目設定
		function() {
			$lvConsole = $('#lv_console');
			var $select = $('#lv-select');
			for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
				$select.append($("<option />").val(i).text(i.toString() + ' (' + sim.skillPtsGiven[i].toString() + ')'));
			}

			$select.change(function() {
				var vocation = getCurrentVocation(this);
				sim.updateLevel(vocation, $(this).val());
				refreshVocationInfo(vocation);
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
			});
		},
		
		//レベル欄ポイント時にUI表示
		function() {
			$('.ent_title h2').hover(function(e) {
				if($(':focus').attr('id') == 'lv-select') return false;

				var vocation = getCurrentVocation(this);
				var consoleLeft = $(this).find('.lv_h2').position().left - 3;

				$lvConsole.appendTo($(this)).css({left: consoleLeft});
				$('#lv-select').val(sim.getLevel(vocation));

				$lvConsole.show();
			}, function(e) {
				if($(':focus').attr('id') == 'lv-select') return false;
				$lvConsole.hide();
			});
		},

		//特訓ポイント選択スピンボタン設定
		function() {
			$trainingPtConsole = $('#training_pt_console');
			var $spinner = $('#training_pt_spinner');
			$spinner.spinner({
				min: sim.TRAINING_SKILL_PTS_MIN,
				max: sim.TRAINING_SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = getCurrentVocation(this);
					
					if(sim.updateTrainingSkillPt(vocation, parseInt(ui.value))) {
						refreshVocationInfo(vocation);
						refreshTotalRequiredExp();
						refreshTotalExpRemain();
						//e.stopPropagation();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var vocation = getCurrentVocation(this);
					var newValue = $(this).val(), oldValue = sim.getTrainingSkillPt(vocation);

					if(isNaN(newValue)) {
						$(this).val(oldValue);
						return false;
					}
					if(sim.updateTrainingSkillPt(vocation, parseInt(newValue))) {
						refreshVocationInfo(vocation);
						refreshTotalRequiredExp();
						refreshTotalExpRemain();
					} else {
						$(this).val(oldValue);
						return false;
					}
				},
				stop: function (e, ui) {
				}
			});
		},
		
		//特訓表示欄ポイント時にUI表示
		function() {
			$('.ent_title .training_pt').hover(function(e) {
				if($(':focus').attr('id') == 'training_pt_spinner') return false;

				var vocation = getCurrentVocation(this);
				var consoleLeft = $('#training-' + vocation).position().left - 3;

				$trainingPtConsole.appendTo($(this)).css({left: consoleLeft});
				$('#training_pt_spinner').val(sim.getTrainingSkillPt(vocation));

				$trainingPtConsole.show();
			}, function(e) {
				if($(':focus').attr('id') == 'training_pt_spinner') return false;
				$trainingPtConsole.hide();
			});
		},
		
		//スピンボタン設定
		function() {
			$ptConsole = $('#pt_console');
			var $spinner = $('#pt_spinner');
			$spinner.spinner({
				min: sim.SKILL_PTS_MIN,
				max: sim.SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = getCurrentVocation(this);
					var skillLine = getCurrentSkillLine(this);

					var succeeded = mspMode ?
						sim.updateMSP(skillLine, parseInt(ui.value)) :
						sim.updateSkillPt(vocation, skillLine, parseInt(ui.value));

					if(succeeded) {
						refreshCurrentSkillPt(vocation, skillLine);
						refreshSkillList(skillLine);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
						e.stopPropagation();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var vocation = getCurrentVocation(this);
					var skillLine = getCurrentSkillLine(this);
					var oldValue = mspMode ?
						sim.getMSP(skillLine) :
						sim.getSkillPt(vocation, skillLine);

					if(isNaN($(this).val())) {
						$(this).val(oldValue);
						return false;
					}
					var succeeded = mspMode ?
						sim.updateMSP(skillLine, parseInt($(this).val())) :
						sim.updateSkillPt(vocation, skillLine, parseInt($(this).val()));

					if(succeeded) {
						refreshCurrentSkillPt(vocation, skillLine);
						refreshSkillList(skillLine);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
					} else {
						$(this).val(oldValue);
						return false;
					}
				},
				stop: function (e, ui) {
					var skillLine = getCurrentSkillLine(this);
					selectSkillLine(skillLine);
				}
			});
		},
		
		//スピンコントロール共通
		function() {
			$('input.ui-spinner-input').click(function(e) {
				//テキストボックスクリック時数値を選択状態に
				$(this).select();

				var skillLine = getCurrentSkillLine(this);
				selectSkillLine(skillLine);
			}).keypress(function(e) {
				//テキストボックスでEnter押下時更新して選択状態に
				if(e.which == 13) {
					$('#url_text').focus();
					$(this).focus().select();
				}
			});
		},

		//スキルライン名ポイント時にUI表示
		function() {
			$('.skill_table caption').hover(function(e) {
				if($(':focus').attr('id') == 'pt_spinner') return false;

				var vocation = getCurrentVocation(this);
				var skillLine = getCurrentSkillLine(this);

				//位置決め
				var $baseSpan = $(this).find('.skill_current');
				var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
				$('#pt_reset').css({'margin-left': $(this).find('.skill_total').width() + 10});

				$ptConsole.appendTo($(this).find('.console_wrapper')).css({left: consoleLeft});
				$('#pt_spinner').val(mspMode ? sim.getMSP(skillLine) : sim.getSkillPt(vocation, skillLine));

				$ptConsole.show();
			}, function(e) {
				if($(':focus').attr('id') == 'pt_spinner') return false;
				$ptConsole.hide();
			}).click(function(e) {
				$ptConsole.hide();
				$(this).mouseenter();
				e.stopPropagation();
			});
		},

		//範囲外クリック時・ESCキー押下時にUI非表示
		function() {
			$ptConsole.click(function(e) {e.stopPropagation();});
			$lvConsole.click(function(e) {e.stopPropagation();});
			$trainingPtConsole.click(function(e) {e.stopPropagation();});

			var hideConsoles = function() {
				$ptConsole.hide();
				$lvConsole.hide();
				$trainingPtConsole.hide();
			};
			$('body').click(hideConsoles).keydown(function(e) {
				if(e.which == 27) hideConsoles();
			});
		},

		//リセットボタン設定
		function() {
			$reset = $('#pt_reset').button({
				icons: { primary: 'ui-icon-refresh' },
				text: false
			}).click(function (e) {
				var vocation = getCurrentVocation(this);
				var skillLine = getCurrentSkillLine(this);
				
				selectSkillLine(skillLine);

				if(mspMode)
					sim.updateMSP(skillLine, 0);
				else
					sim.updateSkillPt(vocation, skillLine, 0);
				$('#pt_spinner').val(0);
				refreshCurrentSkillPt(vocation, skillLine);
				refreshSkillList(skillLine);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
			}).dblclick(function (e) {
				//ダブルクリック時に各職業の該当スキルをすべて振り直し
				if(mspMode) {
					if(!window.confirm('マスタースキルポイントをすべて振りなおします。'))
						return;

					sim.clearMSP();
					for(var skillLine in sim.skillLines) {
						refreshSkillList(skillLine);
					}
				} else {
					var skillLine = getCurrentSkillLine(this);
					var skillName = sim.skillLines[skillLine].name;
					
					if(!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
						return;
					
					sim.clearPtsOfSameSkills(skillLine);
					$('.' + skillLine + ' .skill_current').text('0');
					refreshSkillList(skillLine);
				}

				$('#pt_spinner').val(0);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
			});
		},
		
		//スキルテーブル項目クリック時
		function() {
			$('.skill_table tr[class]').click(function() {
				var vocation = getCurrentVocation(this);
				var skillLine = getCurrentSkillLine(this);
				var skillIndex = parseInt($(this).attr('class').replace(skillLine + '_', ''));
				
				selectSkillLine(skillLine);

				var requiredPt = sim.skillLines[skillLine].skills[skillIndex].pt;
				var totalPtsOfOthers;
				if(mspMode) {
					totalPtsOfOthers = sim.totalOfSameSkills(skillLine) - sim.getMSP(skillLine);
					if(requiredPt < totalPtsOfOthers) return;

					if(!sim.updateMSP(skillLine, requiredPt - totalPtsOfOthers)) return;
				} else {
					totalPtsOfOthers = sim.totalOfSameSkills(skillLine) - sim.getSkillPt(vocation, skillLine);
					if(requiredPt < totalPtsOfOthers) return;

					sim.updateSkillPt(vocation, skillLine, requiredPt - totalPtsOfOthers);
				}
				
				refreshCurrentSkillPt(vocation, skillLine);
				refreshSkillList(skillLine);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
			});
		},
		
		//MSPモード切替ラジオボタン
		function() {
			$('#msp_selector input').change(function(e) {
				toggleMspMode($(this).val() == 'msp');
			});
		},

		//URLテキストボックスクリック・フォーカス時
		function() {
			$('#url_text').focus(function() {
				refreshSaveUrl();
			}).click(function() {
				$(this).select();
			});
		},
		
		//保存用URLツイートボタン設定
		function() {
			$('#tw-saveurl').button().click(function(e) {
				refreshSaveUrl();

				var screenWidth = screen.width, screenHeight = screen.height;
				var windowWidth = 550, windowHeight = 420;
				var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
				var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
				var windowParams = {
					scrollbars: 'yes',
					resizable: 'yes',
					toolbar: 'no',
					location: 'yes',
					width: windowWidth,
					height: windowHeight,
					left: windowLeft,
					top: windowTop
				};
				var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
				window.open(this.href, null, windowParam);
				
				return false;
			});
		},
		
		//おりたたむ・ひろげるボタン設定
		function() {
			var HEIGHT_FOLDED = '48px';
			var HEIGHT_UNFOLDED = $('.class_group').height() + 'px';
			var CLASSNAME_FOLDED = 'folded';

			var $foldToggleButton = $('.toggle_ent').button({
				icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				text: false,
				label: 'おりたたむ'
			}).click(function() {
				var $entry = $(this).parents('.class_group');
				$entry.toggleClass(CLASSNAME_FOLDED);

				if($entry.hasClass(CLASSNAME_FOLDED)) {
					$entry.animate({height: HEIGHT_FOLDED});
					$(this).button('option', {
						icons: {primary: 'ui-icon-arrowthickstop-1-s'},
						label: 'ひろげる'
					});
				} else {
					$entry.animate({height: HEIGHT_UNFOLDED});
					$(this).button('option', {
						icons: {primary: 'ui-icon-arrowthickstop-1-n'},
						label: 'おりたたむ'
					});
				}
			});
			
			//すべておりたたむ・すべてひろげる
			$('#fold-all').click(function(e) {
				$('.class_group:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});
			$('#unfold-all').click(function(e) {
				$('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});
			
			var bodyTop = $('#body_content').offset().top;
			
			//特定職業のみひろげる
			$('#foldbuttons-vocation a').click(function(e) {
				var vocation = $(this).attr('id').replace('fold-', '');
				$('body, html').animate({scrollTop: $('#' + vocation).offset().top - bodyTop});
				if($('#' + vocation).hasClass(CLASSNAME_FOLDED))
					$('#' + vocation + ' .toggle_ent').click();
			});
		},
		
		//レベル一括設定
		function() {
			//セレクトボックス初期化
			var $select = $('#setalllevel>select');
			for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
				$select.append($("<option />").val(i).text(i.toString()));
			}
			$select.val(sim.LEVEL_MAX);
			
			$('#setalllevel>button').button().click(function(e) {
				for(var vocation in sim.vocations) {
					sim.updateLevel(vocation, $select.val());
				}
				refreshAllVocationInfo();
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
				refreshControls();
			});
		},
		
		//全スキルをリセット
		function() {
			$('#clearallskills>button').button({
				icons: { primary: 'ui-icon-refresh' },
			}).click(function(e) {
				if(!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
					return;
				
				sim.clearAllSkills();
				refreshAll();
			});
		},
		
		//ナビゲーションボタン
		function() {
			$('a#hirobaimport').button({
				icons: { primary: 'ui-icon-arrowreturnthick-1-s'}
			});
			$('a#simpleui').button({
				icons: { primary: 'ui-icon-transfer-e-w'}
			}).click(function(e) {
				this.href = this.href.replace(/\?.+$/, '') + '?' +
					Base64.btoa(RawDeflate.deflate(sim.serialize()));
			});

		},
		
		//スキル選択時に同スキルを強調
		function() {
			$('.skill_table').click(function(e) {
				var skillLine = $(this).attr('class').split(' ')[0];
				$('.skill_table').removeClass('selected');
				$('.' + skillLine).addClass('selected');
			});
		},

		//パッシブプリセット
		function() {
			//セレクトボックス初期化
			var SELECT_TABLE = [
				{val: 'pow',   text: 'ちから'},
				{val: 'def',   text: 'みのまもり'},
				{val: 'dex',   text: 'きようさ'},
				{val: 'spd',   text: 'すばやさ'},
				{val: 'magic', text: 'こうげき魔力'},
				{val: 'heal',  text: 'かいふく魔力'},
				{val: 'charm', text: 'みりょく'},
				{val: 'maxhp', text: 'さいだいHP'},
				{val: 'maxmp', text: 'さいだいMP'},
				{val: 'maxhp;maxmp', text: 'さいだいHP・MP'}
			];

			var $select = $('#preset>select');
			for(var i = 0; i < SELECT_TABLE.length; i++) {
				$select.append($("<option />").val(SELECT_TABLE[i].val).text(SELECT_TABLE[i].text));
			}
			$select.val('maxhp;maxmp');

			$('#preset>button').button().click(function(e) {
				for (var v = 0; v < $select.val().split(';').length; v++) {
					sim.presetStatus($select.val().split(';')[v]);
				}
				refreshAll();
			});
		},

		//全職業のレベルを取得スキルに応じて引き上げ
		function() {
			$('#bringUpLevel>button').button({
				icons: { primary: 'ui-icon-arrowthickstop-1-n' },
			}).click(function(e) {
				if(!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで引き上げます。'))
					return;
				
				sim.bringUpLevelToRequired();
				refreshAllVocationInfo();
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
				refreshControls();
			});
		}
	];
	
	//数値を3桁区切りに整形
	function numToFormedStr(num) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}
	
	//API
	return {
		setup: setup
	};

})(jQuery);

var SimpleUI = (function($) {
	var CLASSNAME_SKILL_ENABLED = 'enabled';
	var CLASSNAME_ERROR = 'error';
	
	var sim = Simulator;

	var $ptConsole, $lvConsole, $trainingPtConsole;
	
	function refreshAll() {
		refreshAllVocationInfo();
		for(var skillLine in sim.skillLines) {
			refreshSkillList(skillLine);
		}
		//refreshTotalRequiredExp();
		//refreshTotalExpRemain();
		// refreshTotalPassive();
		refreshControls();
		refreshSaveUrl();
	}
	
	function refreshVocationInfo(vocation) {
		var currentLevel = sim.getLevel(vocation);
		var requiredLevel = sim.requiredLevel(vocation);
		
		//スキルポイント 残り / 最大値
		var maxSkillPts = sim.maxSkillPts(vocation);
		var additionalSkillPts = sim.getTrainingSkillPt(vocation);
		var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocation);

		$('#' + vocation + ' .remain .container').text(remainingSkillPts);
		$('#' + vocation + ' .total .container').text(maxSkillPts + additionalSkillPts);
		$('#' + vocation + ' .level').text('Lv ' + currentLevel + ' (' + maxSkillPts + ') + 特訓 (' + additionalSkillPts + ')');
		
		//Lv不足の処理
		var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
		$('#' + vocation + ' .remain .container').toggleClass(CLASSNAME_ERROR, isLevelError);
	}
	
	function refreshAllVocationInfo() {
		for(var vocation in sim.vocations) {
			refreshVocationInfo(vocation);
		}
		$('#msp .remain .container').text(sim.MSP_MAX - sim.totalMSP());
		$('#msp .total .container').text(sim.MSP_MAX);
	}
	
	function refreshTotalRequiredExp() {
		$('#total_exp').text(numToFormedStr(sim.totalRequiredExp()));
	}
	
	function refreshTotalExpRemain() {
		var totalExpRemain = sim.totalExpRemain();
		$('#total_exp_remain, #total_exp_remain_label').toggleClass(CLASSNAME_ERROR, totalExpRemain > 0);
		$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
	}
	
	function refreshTotalPassive() {
		var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
		for(var i = 0; i < status.length; i++) {
			$('#total_' + status[i]).text(sim.totalStatus(status[i]));
		}
	}
	
	function refreshSkillList(skillLine) {
		var totalOfSkill = sim.totalOfSameSkills(skillLine);
		$('#footer .' + skillLine + ' .container').text(totalOfSkill);

		var containerName = '#msp .' + skillLine;
		if(sim.skillLines[skillLine].unique) {
			for(var vocation in sim.vocations) {
				if($.inArray(skillLine, sim.vocations[vocation].skillLines) >= 0) {
					containerName = '#' + vocation + ' .msp';
					break;
				}
			}
		}

		var msp = sim.getMSP(skillLine);
		$(containerName + ' .container').text(msp > 0 ? msp : '');
	}
	
	function refreshControls() {
		for(var vocation in sim.vocations) {
			for(var s = 0; s < sim.vocations[vocation].skillLines.length; s++) {
				var skillLine = sim.vocations[vocation].skillLines[s];
				refreshCurrentSkillPt(vocation, skillLine);
			}
		}
	}
	
	function refreshCurrentSkillPt(vocation, skillLine) {
		var containerName = skillLine;
		if(sim.skillLines[skillLine].unique)
			containerName = 'unique';

		$('#' + vocation + ' .' + containerName + ' .container')
			.text(sim.getSkillPt(vocation, skillLine));
	}

	function refreshSaveUrl() {
		var url = window.location.href.replace(window.location.search, "") + '?' +
			Base64.btoa(RawDeflate.deflate(sim.serialize()));

		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 現在のスキル構成:',
			hashtags: 'DQ10, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		};
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
	}
	
	function getCurrentVocation(currentNode) {
		return $(currentNode).parents('.class_group').attr('id');
	}

	function getCurrentSkillLine(currentNode) {
		return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
	}

	function setup() {
		for(var i = 0; i < setupFunctions.length; i++) {
			setupFunctions[i]();
		}
		refreshAll();
	}
	
	var setupFunctions = [
		
		//URLテキストボックスクリック・フォーカス時
		function() {
			$('#url_text').focus(function() {
				refreshSaveUrl();
			}).click(function() {
				$(this).select();
			});
		},
		
		//保存用URLツイートボタン設定
		function() {
			$('#tw-saveurl').button().click(function(e) {
				refreshSaveUrl();

				var screenWidth = screen.width, screenHeight = screen.height;
				var windowWidth = 550, windowHeight = 420;
				var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
				var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
				var windowParams = {
					scrollbars: 'yes',
					resizable: 'yes',
					toolbar: 'no',
					location: 'yes',
					width: windowWidth,
					height: windowHeight,
					left: windowLeft,
					top: windowTop
				};
				var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
				window.open(this.href, null, windowParam);
				
				return false;
			});
		},
		
		//ナビゲーションボタン
		function() {
			$('a#mainui').button({
				icons: { primary: 'ui-icon-transfer-e-w'}
			}).click(function(e) {
				this.href = this.href.replace(/\?.+$/, '') + '?' +
					Base64.btoa(RawDeflate.deflate(sim.serialize()));
			});

		}
	];
	
	//数値を3桁区切りに整形
	function numToFormedStr(num) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}
	
	//API
	return {
		setup: setup
	};

})(jQuery);

//Base64 URI safe
//[^\x00-\xFF]な文字しか来ない前提
var Base64 = (function(global) {
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

	var _btoa_impl = function(b) {
		return b.replace(/.{1,3}/g, function(m) {
			var bits = 0;
			for(var i = 0; i < m.length; i++)
				bits = bits | (m.charCodeAt(i) << ((2 - i) * 8));

			return [
				EN_CHAR.charAt(bits >>> 18),
				EN_CHAR.charAt((bits >>> 12) & 63),
				m.length > 1 ? EN_CHAR.charAt((bits >>> 6) & 63) : '',
				m.length > 2 ? EN_CHAR.charAt(bits & 63) : ''
			].join('');
		});
	};

	var _atob_impl = function(a) {
		return a.replace(/.{1,4}/g, function(m) {
			var bits = 0;
			for(var i = 0; i < m.length; i++)
				bits = bits | (EN_CHAR.indexOf(m.charAt(i)) << ((3 - i) * 6));

			return [
				String.fromCharCode(bits >>> 16),
				m.length > 1 ? String.fromCharCode((bits >>> 8) & 0xFF) : '',
				m.length > 2 ? String.fromCharCode(bits & 0xFF) : ''
			].join('');
		});
	};

	var btoa = global.btoa ? function(b) {
		return global.btoa(b)
			.replace(/[+\/]/g, function(m0) {return m0 == '+' ? '-' : '_';})
			.replace(/=/g, '');
	} : _btoa_impl;

	var atob = global.atob ? function(a) {
		a = a.replace(/[-_]/g, function(m0) {return m0 == '-' ? '+' : '/';});
		if(a.length % 4 == 1) a += 'A';

		return global.atob(a);
	} : _atob_impl;

	function isValid(a) {
		return (/^[A-Za-z0-9-_]+$/).test(a);
	}

	//API
	return {
		btoa: btoa,
		atob: atob,
		isValid: isValid
	};
})(window);

//ロード時
jQuery(function($) {
	var query = window.location.search.substring(1);
	var ui = window.location.pathname.indexOf('/simple.html') > 0 ? SimpleUI : SimulatorUI;
	
	if(Base64.isValid(query)) {
		var serial = '';

		try {
			serial = RawDeflate.inflate(Base64.atob(query));
		} catch(e) {
		}
		
		if(serial.length < 33) { //バイト数が小さすぎる場合inflate失敗とみなす。(8+7*5)*6/8=32.25
			serial = Base64.atob(query);
			Simulator.deserializeBit(serial);
		} else {
			Simulator.deserialize(serial);
		}
	}
	
	ui.setup();
});
