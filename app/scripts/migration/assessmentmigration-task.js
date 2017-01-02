'use strict';

EkstepEditor.migration.assessmentmigration_task = new(Class.extend({
    init: function() {
        console.log('assessment migration task initialized');
    },
    contentbody: undefined,
    template: [],
    id: 'org.ekstep.quiz',
    quiz: { x: 0, y: 0, w: 0, h: 0, visible: true, editable: true, 'z-index': 0, data: { __cdata: { questionnaire: {}, template: [] } }, config: { __cdata: { "type": "items", "var": "item" } } },
    migrate: function(contentbody) {
        var deferred = EkstepEditor.$q.defer(),
            instance = this;
        this.contentbody = contentbody;

        _.forEach(contentbody.theme.stage, function(stage, index) {
            if (!_.isUndefined(stage.iterate) && (_.has(stage, 'emdeb') || _.find(stage.g, function(g){return _.has(g, 'embed')}))) {
                instance.transformToQuiz(stage);
                instance.quiz.data.__cdata = JSON.stringify(instance.quiz.data.__cdata);
                instance.quiz.config.__cdata = JSON.stringify(instance.quiz.config.__cdata);
                instance.removeObsoleteTag(stage);
                instance.addPluginToMedia();                
            }
            if (contentbody.theme.stage.length === index + 1) deferred.resolve(contentbody);
        });

        return deferred.promise;
    },
    getController: function(controllerId) {
        return _.find(this.contentbody.theme.controller, function(ctrl) {
            return ctrl.id === controllerId;
        });
    },
    getTemplate: function(templateId) {        
        return _.find(this.contentbody.theme.template, function(template) {
            return template.id === templateId;
        });        
    },
    transformToQuiz: function(stage) { 
        var instance = this,        	
            questionnaire;

        questionnaire = instance.quiz.data.__cdata.questionnaire = instance.getController(stage.iterate).__cdata;        
        _.forEach(questionnaire.item_sets, function(itemset) {
            _.forEach(questionnaire.items[itemset.id], function(items) {
                if (items.template) {
                    instance.quiz.data.__cdata.template.push(instance.getTemplate(items.template));
                    instance.removeObsoleteTemplate(items.template);
                }
            });
        });
        stage[instance.id] = instance.quiz;
    },
    removeObsoleteTag: function(stage) {
        if (_.has(stage, 'embed')) delete stage.embed;
        if (_.has(stage, 'g')) _.remove(stage.g, function(g){return _.has(g, 'embed')});        
        if (_.has(stage, 'appEvents')) delete stage.appEvents;
        delete stage.iterate;
    },
    removeObsoleteTemplate: function(templateId) {
    	return _.remove(this.contentbody.theme.template, function(template){
    		return template.id === templateId;
    	});
    },
    addPluginToMedia: function() {
        this.contentbody.theme.manifest.media.push({id: 'org.ekstep.quiz', type: 'plugin', src: 'http://localhost:3000/plugins/org.ekstep.quiz-1.0/editor/plugin.js'});
    }
}));