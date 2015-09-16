(function() {
  Meteor.startup(function() {
    return Template.registerHelper('nl2br', function(string) {
      if (string && !_.isEmpty(string)) {
        return string.replace(/(?:\r\n|\r|\n)/g, '<br />');
      } else {
        return void 0;
      }
    });
  });

  Template.main.onCreated(function() {
    this._nodes = {};
    this.nodesDS = [];
    this._edges = {};
    this.edgesDS = [];
    this.Network = null;
    this.nodeFrom = new ReactiveVar(false);
    this.nodeTo = new ReactiveVar(false);
    this.relationship = new ReactiveVar(false);
    return this.resetNodes = (function(_this) {
      return function(type) {
        if (type == null) {
          type = false;
        }
        switch (type) {
          case false:
            if (_this.nodeFrom.get() && _this._nodes[_this.nodeFrom.get().id]) {
              _this.nodesDS.update({
                id: _this.nodeFrom.get().id,
                font: {
                  background: "rgba(255,255,255,.0)"
                }
              });
            }
            if (_this.nodeTo.get() && _this._nodes[_this.nodeTo.get().id]) {
              _this.nodesDS.update({
                id: _this.nodeTo.get().id,
                font: {
                  background: "rgba(255,255,255,.0)"
                }
              });
            }
            _this.nodeFrom.set(false);
            return _this.nodeTo.set(false);
          case 'to':
            if (_this.nodeTo.get() && _this._nodes[_this.nodeTo.get().id]) {
              _this.nodesDS.update({
                id: _this.nodeTo.get().id,
                font: {
                  background: "rgba(255,255,255,.0)"
                }
              });
            }
            return _this.nodeTo.set(false);
          case 'from':
            if (_this.nodeFrom.get() && _this._nodes[_this.nodeFrom.get().id]) {
              _this.nodesDS.update({
                id: _this.nodeFrom.get().id,
                font: {
                  background: "rgba(255,255,255,.0)"
                }
              });
            }
            return _this.nodeFrom.set(false);
          case 'edge':
            if (_this.relationship.get() && _this._edges[_this.relationship.get().id]) {
              _this.edgesDS.update({
                id: _this.relationship.get().id,
                font: {
                  background: "rgba(255,255,255,.0)"
                }
              });
            }
            return _this.relationship.set(false);
        }
      };
    })(this);
  });

  Template.main.helpers({
    nodeFrom: function() {
      return Template.instance().nodeFrom.get();
    },
    nodeTo: function() {
      return Template.instance().nodeTo.get();
    },
    relationship: function() {
      return Template.instance().relationship.get();
    },
    getNodeDegree: function(node) {
      var degree, e, key, ref;
      degree = 0;
      ref = Template.instance()._edges;
      for (key in ref) {
        e = ref[key];
        if (e.from === node.id || e.to === node.id) {
          ++degree;
        }
      }
      return degree;
    },
    isLabel: function(label, node) {
      return !!~node.labels.indexOf(label);
    }
  });

  Template.main.events({
    'click button#deleteNode': function(e, template) {
      var id;
      e.preventDefault();
      if (template.nodeFrom.get()) {
        e.currentTarget.textContent = 'Removing...';
        e.currentTarget.disabled = true;
        id = template.nodeFrom.get().id;
        Meteor.call('deleteNode', id, function(error) {
          if (error) {
            throw new Meteor.Error(error);
          } else {
            template.nodesDS.remove(id);
            delete template._nodes[id];
            template.resetNodes();
            return template.resetNodes('edge');
          }
        });
      }
      return false;
    },
    'submit form#createNode': function(e, template) {
      var form;
      e.preventDefault();
      template.$(e.currentTarget).find(':submit').text('Creating...').prop('disabled', true);
      form = {
        name: e.target.name.value,
        label: e.target.label.value,
        description: e.target.description.value
      };
      if (e.target.name.value.length > 0 && e.target.label.value.length > 0) {
        Meteor.call('createNode', form, function(error, node) {
          if (error) {
            throw new Meteor.Error(error);
          } else {
            template.nodesDS.add(node);
            template._nodes[node.id] = node;
            template.$(e.currentTarget).find(':submit').text('Create Node').prop('disabled', false);
            return $(e.currentTarget)[0].reset();
          }
        });
      }
      return false;
    },
    'submit form#editNode': function(e, template) {
      var form;
      e.preventDefault();
      template.$(e.currentTarget).find(':submit').text('Saving...').prop('disabled', true);
      form = {
        name: e.target.name.value,
        label: e.target.label.value,
        description: e.target.description.value,
        id: template.nodeFrom.get().id
      };
      if (e.target.name.value.length > 0 && e.target.label.value.length > 0) {
        Meteor.call('updateNode', form, function(error, node) {
          if (error) {
            throw new Meteor.Error(error);
          } else {
            template.nodesDS.update(node);
            template._nodes[node.id] = node;
            template.$(e.currentTarget).find(':submit').text('Update Node').prop('disabled', false);
            $(e.currentTarget)[0].reset();
            template.resetNodes();
            return template.resetNodes('edge');
          }
        });
      }
      return false;
    },
    'submit form#createRelationship': function(e, template) {
      var form;
      e.preventDefault();
      template.$(e.currentTarget).find(':submit').text('Creating...').prop('disabled', true);
      form = {
        type: e.target.type.value,
        description: e.target.description.value,
        from: template.nodeFrom.get().id,
        to: template.nodeTo.get().id
      };
      if (e.target.type.value.length > 0) {
        Meteor.call('createRelationship', form, function(error, edge) {
          if (error) {
            throw new Meteor.Error(error);
          } else {
            template.edgesDS.add(edge);
            template._edges[edge.id] = edge;
            template.$(e.currentTarget).find(':submit').text('Create Relationship').prop('disabled', false);
            $(e.currentTarget)[0].reset();
            template.resetNodes();
            return template.resetNodes('edge');
          }
        });
      }
      return false;
    },
    'submit form#updateRelationship': function(e, template) {
      var form, id;
      e.preventDefault();
      template.$(e.currentTarget).find(':submit').text('Updating...').prop('disabled', true);
      id = template.relationship.get().id;
      form = {
        id: id,
        type: e.target.type.value,
        description: e.target.description.value,
        from: template.relationship.get().from,
        to: template.relationship.get().to
      };
      if (e.target.type.value.length > 0) {
        Meteor.call('updateRelationship', form, function(error, edge) {
          if (error) {
            throw new Meteor.Error(error);
          } else if (_.isObject(edge)) {
            template.edgesDS.remove(id);
            delete template._edges[id];
            template.edgesDS.add(edge);
            template._edges[edge.id] = edge;
          }
          template.$(e.currentTarget).find(':submit').text('Update Relationship').prop('disabled', false);
          $(e.currentTarget)[0].reset();
          template.resetNodes();
          return template.resetNodes('edge');
        });
      }
      return false;
    },
    'click button#deleteRelationship': function(e, template) {
      var id;
      e.preventDefault();
      e.currentTarget.textContent = 'Removing...';
      e.currentTarget.disabled = true;
      id = template.relationship.get().id;
      Meteor.call('deleteRelationship', id, function(error, edge) {
        if (error) {
          throw new Meteor.Error(error);
        } else {
          template.edgesDS.remove(id);
          delete template._edges[id];
          template.resetNodes();
          return template.resetNodes('edge');
        }
      });
      return false;
    }
  });

  Template.main.onRendered(function() {
    var container, data, fetchData, lastTimestamp, options;
    container = document.getElementById('graph');
    this.nodesDS = new vis.DataSet([]);
    this.edgesDS = new vis.DataSet([]);
    data = {
      nodes: this.nodesDS,
      edges: this.edgesDS
    };
    options = {
      height: '400px',
      nodes: {
        shape: 'dot',
        scaling: {
          min: 10,
          max: 30,
          label: {
            min: 8,
            max: 30,
            drawThreshold: 12,
            maxVisible: 20
          }
        }
      },
      interaction: {
        hover: true,
        navigationButtons: false
      },
      physics: {
        stabilization: false
      }
    };
    this.Network = new vis.Network(container, data, options);
    this.Network.addEventListener('click', (function(_this) {
      return function(data) {
        var ref, ref1, ref2, ref3;
        if (_this.relationship.get()) {
          _this.resetNodes('edge');
        }
        if (data != null ? (ref = data.nodes) != null ? ref[0] : void 0 : void 0) {
          if (!_this.nodeFrom.get()) {
            _this.nodesDS.update({
              id: data.nodes[0],
              font: {
                background: "#FBFD70"
              }
            });
            return _this.nodeFrom.set(_this._nodes[data.nodes[0]]);
          } else if (_this.nodeFrom.get() && !_this.nodeTo.get()) {
            if (_this.nodeFrom.get().id !== data.nodes[0]) {
              _this.nodesDS.update({
                id: data.nodes[0],
                font: {
                  background: "#FBFD70"
                }
              });
              return _this.nodeTo.set(_this._nodes[data.nodes[0]]);
            }
          } else if (_this.nodeFrom.get() && _this.nodeTo.get()) {
            _this.resetNodes();
            _this.nodesDS.update({
              id: data.nodes[0],
              font: {
                background: "#FBFD70"
              }
            });
            return _this.nodeFrom.set(_this._nodes[data.nodes[0]]);
          }
        } else if (data != null ? (ref1 = data.edges) != null ? ref1[0] : void 0 : void 0) {
          _this.resetNodes();
          _this.edgesDS.update({
            id: data.edges[0],
            font: {
              background: "#FBFD70"
            }
          });
          return _this.relationship.set(_this._edges[data.edges[0]]);
        } else if (!(data != null ? (ref2 = data.nodes) != null ? ref2[0] : void 0 : void 0) && !(data != null ? (ref3 = data.edges) != null ? ref3[0] : void 0 : void 0)) {
          return _this.resetNodes();
        }
      };
    })(this));
    lastTimestamp = 0;
    fetchData = (function(_this) {
      return function() {
        Meteor.call('graph', lastTimestamp - 250, function(error, data) {
          var edge, i, j, len, len1, node, ref, ref1, ref2, ref3, ref4, ref5;
          if (error) {
            throw new Meteor.Error(error);
          } else {
            ref = data.nodes;
            for (i = 0, len = ref.length; i < len; i++) {
              node = ref[i];
              if (node.removed) {
                if ((ref1 = _this._nodes) != null ? ref1[node.id] : void 0) {
                  _this.nodesDS.remove(node.id);
                  delete _this._nodes[node.id];
                }
              } else {
                if ((ref2 = _this._nodes) != null ? ref2[node.id] : void 0) {
                  _this.nodesDS.update(node);
                } else {
                  _this.nodesDS.add([node]);
                }
                _this._nodes[node.id] = node;
              }
            }
            ref3 = data.edges;
            for (j = 0, len1 = ref3.length; j < len1; j++) {
              edge = ref3[j];
              if (edge.removed) {
                if ((ref4 = _this._edges) != null ? ref4[edge.id] : void 0) {
                  _this.edgesDS.remove(edge.id);
                  delete _this._edges[node.id];
                }
              } else {
                if ((ref5 = _this._edges) != null ? ref5[edge.id] : void 0) {
                  _this.edgesDS.update(edge);
                } else {
                  _this.edgesDS.add([edge]);
                }
                _this._edges[edge.id] = edge;
              }
            }
          }

          /*
          Set up long-polling
           */
          return Meteor.setTimeout(fetchData, 1500);
        });
        return lastTimestamp = +(new Date);
      };
    })(this);
    return fetchData();
  });

}).call(this);

