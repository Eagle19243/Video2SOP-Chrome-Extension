function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i=0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function calcArrowAngle(x1, y1, x2, y2) {
  var angle = 0,
    x, y;

  x = (x2 - x1);
  y = (y2 - y1);

  if (x === 0) {
    angle = (y === 0) ? 0 : (y > 0) ? Math.PI / 2 : Math.PI * 3 / 2;
  } else if (y === 0) {
    angle = (x > 0) ? 0 : Math.PI;
  } else {
    angle = (x < 0) ? Math.atan(y / x) + Math.PI : (y < 0) ? Math.atan(y / x) + (2 * Math.PI) : Math.atan(y / x);
  }

  return (angle * 180 / Math.PI + 90);
}

function addArrowToCanvas(x, y, direction) {
  var line,
      arrow,
      circle,
      id = makeid();

  var params;

  if (direction === 'left') {
    params = [x + 130, y, x + 230, y];
  } else {
    params = [x - 130, y, x - 230, y];
  }

  line = new fabric.Line(params, {
    strokeWidth: 8,
    fill: 'green',
    stroke: 'green',
    originX: 'center',
    originY: 'center',
    name: id,
    lockScalingX: true,
    lockScalingY: true
  });

  line.setControlsVisibility({
    'tl':false,
    'tr':true,
    'bl':false,
    'br':false,
    'ml':false,
    'mt':false,
    'mr':false,
    'mb':false,
    'mtr':false
  });

  var centerX = (line.x1 + line.x2) / 2,
      centerY = (line.y1 + line.y2) / 2;

  deltaX = line.left - centerX,
  deltaY = line.top - centerY;

  arrow = new fabric.Triangle({
    left: line.get('x1') + deltaX,
    top: line.get('y1') + deltaY,
    originX: 'center',
    originY: 'center',
    hasBorders: false,
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true,
    stroke: 'transparent',
    lockRotation: true,
    pointType: 'arrow_start',
    hasRotatingPoint: false,
    angle: 45,
    width: 25,
    height: 25,
    fill: 'green',
    name: id
  });

  arrow.line = line;

  circle = new fabric.Circle({
    left: line.get('x2') + deltaX,
    top: line.get('y2') + deltaY,
    radius: 10,
    originX: 'center',
    originY: 'center',
    hasBorders: false,
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    pointType: 'arrow_end',
    fill: 'transparent',
    name: id
  });

  circle.line = line;

  line.customType = arrow.customType = circle.customType = 'arrow';
  line.circle = arrow.circle = circle;
  line.arrow = circle.arrow = arrow;

  arrow.set('angle', calcArrowAngle(line.get('x1'), line.get('y1'), line.get('x2'), line.get('y2')) - 180);

  canvas.add(line, arrow, circle);

  function moveEnd(obj) {
    var p = obj,
        x1, y1, x2, y2;

    if (obj.pointType === 'arrow_end') {
      obj.line.set('x2', obj.get('left'));
      obj.line.set('y2', obj.get('top'));
    } else {
      obj.line.set('x1', obj.get('left'));
      obj.line.set('y1', obj.get('top'));
    }

    obj.line._setWidthHeight();

    x1 = obj.line.get('x1');
    y1 = obj.line.get('y1');
    x2 = obj.line.get('x2');
    y2 = obj.line.get('y2');

    angle = calcArrowAngle(x1, y1, x2, y2);

    if (obj.pointType === 'arrow_end') {
      obj.arrow.set('angle', angle - 180);
    } else {
      obj.set('angle', angle - 180);
    }

    obj.line.setCoords();
    canvas.renderAll();
  }

  function moveLine() {
    var oldCenterX = (line.x1 + line.x2) / 2,
        oldCenterY = (line.y1 + line.y2) / 2,
        deltaX = line.left - oldCenterX,
        deltaY = line.top - oldCenterY;

    line.arrow.set({
      'left': line.x1 + deltaX,
      'top': line.y1 + deltaY
    }).setCoords();

    line.circle.set({
      'left': line.x2 + deltaX,
      'top': line.y2 + deltaY
    }).setCoords();

    line.set({
      'x1': line.x1 + deltaX,
      'y1': line.y1 + deltaY,
      'x2': line.x2 + deltaX,
      'y2': line.y2 + deltaY
    });

    line.set({
      'left': (line.x1 + line.x2) / 2,
      'top': (line.y1 + line.y2) / 2
    });
  }

  arrow.on('moving', function () {
      moveEnd(arrow);
  });

  circle.on('moving', function () {
      moveEnd(circle);
  });

  line.on('moving', function () {
      moveLine();
  });
}

var canvas, bg;

$(function () {
  var tool,
      parentOffset,
      selected = false,
      color;

  canvas = new fabric.Canvas('canvas', {
    uniScaleTransform: true,
    selectionColor: 'rgba(0,0,0,0.1)',
    selectionBorderColor: '#000',
    selectionLineWidth: 2,
    selection: false,
    hoverCursor: 'pointer'
  });

  canvas.freeDrawingBrush.width = 4;

  var HideControls = {
    'tl':true,
    'tr':true,
    'bl':true,
    'br':true,
    'ml':false,
    'mt':false,
    'mr':false,
    'mb':false,
    'mtr':false
  };

  fabric.Canvas.prototype.customiseControls({
    tr: {
      action: function(e, target) {
        removeSelected();
      },
      cursor: 'pointer'
    },
  });

  fabric.Object.prototype.customiseCornerIcons({
    tl: {
      icon: 'img/point.png'
    },
    tr: {
      icon: 'img/cross.png'
    },
    bl: {
      icon: 'img/point.png'
    },
    br: {
      icon: 'img/point.png'
    },
    settings: {
      borderColor: '#929292',
      cornerSize: 22,
      cornerShape: 'rect',
      cornerBackgroundColor: 'transparent',
      cornerPadding: 6
    }
  });

  canvas.on('after:render', function (e) {
    var ctx = canvas.getContext('2d'),
        objects = canvas.getObjects(),
        size = canvas.size();

    for (var i = 0, len = size; i < len; i++) {
      if (objects[i] !== undefined) {
        if (objects[i].name === 'crop') {
            ctx.clearRect(objects[i].get('left'), objects[i].get('top'), objects[i].get('width'), objects[i].get('height'));
        }
      }
    }
  });

  canvas.on('object:selected', function(e) {
    if (e.target.pointType && (e.target.pointType === 'arrow_end' || e.target.pointType === 'arrow_start')) {
        $('#palette').hide();

        $('#delete').addClass('disabled');
        $('#deselect').addClass('disabled');

        return;
    }

    if (canvas.getActiveObject().get('type') === 'path' ||
        canvas.getActiveObject().get('type') === 'line') {
        canvas.getActiveObject().set('hasRotatingPoint', false);
    }

    if (e.target.name === 'rect_blur') {
      return;
    }

    e.target.set('padding', 15);

    $('#delete').removeClass('disabled');
    $('#deselect').removeClass('disabled');

    $('#palette').show();
  });

  canvas.on('selection:cleared', function() {
    var clearedObject;
    if (typeof(canvas.getActiveObject()) !== 'undefined') {
      clearedObject = canvas.getActiveObject();
    }
    else {
      clearedObject = canvas.getActiveGroup();
    }

    $('#delete').addClass('disabled');
    $('#deselect').addClass('disabled');

    $('#palette').hide();
  });

  function removeSelected() {
    var item = canvas.getActiveObject();

    if (item) {
      if (item.get('name') === 'rect_blur') {
        stackBlurCanvasRGBA('canvas', 0, 0, 0, 0, 0);
      }

      if (item.get('customType') && item.get('customType') === 'arrow') {
        var objects = canvas.getObjects(),
            name = item.get('name'),
            size = canvas.size();

        for (var i = 0, len = size; i < len; i++) {
          if (objects[i] !== undefined) {
            if (objects[i].customType &&
                objects[i].customType === 'arrow' &&
                objects[i].name === name) {
                objects[i].remove();
            }
          }
        }

        objects = canvas.getObjects();
        for (var i = 0, len = size; i < len; i++) {
          if (objects[i] !== undefined) {
            if (objects[i].type &&
                objects[i].type === 'triangle' &&
                objects[i].name === name) {
                objects[i].remove();
            }
          }
        }
      } else {
        item.remove();
      }

      setTimeout( function() {
          canvas.deactivateAll();
      }, 0);
    }

    canvas.renderAll();
    $('#palette').hide();
  }

  $('#edit-area').mouseover(function (e) {
    if (selected) {
      canvas.defaultCursor = 'crosshair';
    } else {
      canvas.defaultCursor = 'default';
    }
  });

  $(document).on('click', '#delete', removeSelected);

  document.addEventListener('keydown', function(e) {
    if (e.keyCode === 46 && canvas.getActiveObject() != null) {
      removeSelected();
    }
  });

  // Palette

  $(document).on('click', '#palette li', function() {
    $('#palette').find('li.active').removeClass('active');

    $(this).addClass('active');

    color = $(this).find('a').attr('class');

    if (canvas.getActiveObject()) {
      switch (canvas.getActiveObject().get('type')) {
        case 'i-text':
          canvas.getActiveObject().set('textBackgroundColor', color);
          canvas.getActiveObject().set('fill', color === 'yellow' ? '#000' : '#fff');
        break;

        case 'line':
        case 'triangle':
          var objects = canvas.getObjects();
          for (var i = 0, len = canvas.size(); i < len; i++) {
            if (objects[i].customType && objects[i].customType === 'arrow' &&
              canvas.getActiveObject().get('name') === objects[i].name &&
              objects[i].pointType !== 'arrow_end') {
              if (objects[i].pointType === 'arrow_start') {
                objects[i].setFill(color);
              } else {
                objects[i].setStroke(color);
              }
            }
          }
        break;

        case 'path':
          canvas.getActiveObject().set('stroke', color);
        break;

        case 'rect':
          canvas.getActiveObject().set('stroke', color);
        break;
      }
    }

    canvas.renderAll();

    canvas.freeDrawingBrush.color = $('#palette').find('li.active a').attr('class');
  });

  $(document).bind('toolDeactivated', function() {
    $('#palette').hide();
    canvas.defaultCursor = 'default';
  });

  // Editable objects

  $(document).on('click', 'ul.nav li', function() {
    canvas.isDrawingMode = false;
    selected = true;

    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    if ($(this).is('#delete')) return;

    color = $('#palette').find('li.active a').attr('class');

    $('#palette').hide();

    if ($(this).hasClass('active') || $(this).attr('id') === 'save') {
      $(this).removeClass('active');
      selected = false;
      return;
    }

    $('ul.nav').find('li.active').removeClass('active');
    $(this).addClass('active');

    tool = $('ul.nav li.active a');
    switch(tool.attr('class')) {
      case 'text':
        $('#palette').show();
      break;

      case 'arrow':
        $('#palette').show();

        var line, triangle, isDown, grid = 1;

        canvas.on('mouse:down', function(o) {
          isDown = true;

        function moveEnd(obj) {
          var p = obj,
              x1, y1, x2, y2;

          if (obj.pointType === 'arrow_start') {
              obj.line.set('x2', obj.get('left'));
              obj.line.set('y2', obj.get('top'));
          } else {
              obj.line.set('x1', obj.get('left'));
              obj.line.set('y1', obj.get('top'));
          }

          obj.line._setWidthHeight();

          x1 = obj.line.get('x1');
          y1 = obj.line.get('y1');
          x2 = obj.line.get('x2');
          y2 = obj.line.get('y2');

          angle = calcArrowAngle(x2, y2, x1, y1);

          if (obj.pointType === 'arrow_end') {
              obj.triangle.set('angle', angle - 180);
          } else {
              obj.set('angle', angle - 180);
          }

          obj.line.setCoords();
          canvas.renderAll();
        }

        function moveLine() {
          var oldCenterX = (line.x1 + line.x2) / 2,
              oldCenterY = (line.y1 + line.y2) / 2,
              deltaX = line.left - oldCenterX,
              deltaY = line.top - oldCenterY;

          line.triangle.set({
              'left': line.x2 + deltaX,
              'top': line.y2 + deltaY
          }).setCoords();

          line.circle.set({
              'left': line.x1 + deltaX,
              'top': line.y1 + deltaY
          }).setCoords();

          line.set({
              'x1': line.x1 + deltaX,
              'y1': line.y1 + deltaY,
              'x2': line.x2 + deltaX,
              'y2': line.y2 + deltaY
          });

          line.set({
              'left': (line.x1 + line.x2) / 2,
              'top': (line.y1 + line.y2) / 2
          });
        }

          var pointer = canvas.getPointer(o.e),
              points = [Math.round(pointer.x / grid) * grid, Math.round(pointer.y / grid) * grid, pointer.x, pointer.y],
              id = makeid();

          line = new fabric.Line(points, {
            strokeWidth: 8,
            fill: color,
            stroke: color,
            originX: 'center',
            originY: 'center',
            name: id,
            lockScalingX: true,
            lockScalingY: true
          });

          line.setControlsVisibility({
            'tl':false,
            'tr':true,
            'bl':false,
            'br':false,
            'ml':false,
            'mt':false,
            'mr':false,
            'mb':false,
            'mtr':false
          });

          centerX = (line.x1 + line.x2) / 2;
          centerY = (line.y1 + line.y2) / 2;

          deltaX = line.left - centerX;
          deltaY = line.top - centerY;

          triangle = new fabric.Triangle({
            left: line.get('x1') + deltaX,
            top: line.get('y1') + deltaY,
            originX: 'center',
            originY: 'center',
            hasBorders: false,
            hasControls: false,
            lockScalingX: true,
            lockScalingY: true,
            stroke: 'transparent',
            lockRotation: true,
            pointType: 'arrow_start',
            hasRotatingPoint: false,
            angle: -45,
            width: 25,
            height: 25,
            fill: color,
            name: id
          });

          triangle.line = line;

          circle = new fabric.Circle({
            left: line.get('x2') + deltaX,
            top: line.get('y2') + deltaY,
            radius: 10,
            originX: 'center',
            originY: 'center',
            hasBorders: false,
            hasControls: false,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            pointType: 'arrow_end',
            fill: 'transparent',
            name: id
          });

          circle.line = line;

          line.customType = triangle.customType = circle.customType = 'arrow';
          line.circle = triangle.circle = circle;
          line.triangle = circle.triangle = triangle;

          triangle.on('moving', function () {
              moveEnd(triangle);
          });

          circle.on('moving', function () {
              moveEnd(circle);
          });

          line.on('moving', function () {
              moveLine();
          });

          canvas.add(line, triangle, circle);
        });

        canvas.on('mouse:move', function(o) {
          if (!isDown) return;

          var pointer = canvas.getPointer(o.e);

          line.set({
            x2: pointer.x,
            y2: pointer.y
          });

          triangle.set({
            'left': pointer.x + deltaX,
            'top': pointer.y + deltaY,
            'angle': calcArrowAngle(line.x1, line.y1, line.x2, line.y2)
          });

          canvas.renderAll();
        });

        canvas.on('mouse:up', function(o) {
          isDown = false;

          canvas.off('mouse:down');
          canvas.off('mouse:move');
          canvas.off('mouse:up');

          line.setCoords();
          triangle.setCoords();
          circle.setCoords();

          var originColor, isOver;
          canvas.off('mouse:over').on('mouse:over', function(e) {
            isOver = true;
            originColor = e.target.get('fill');
            if (e.target && !canvas.getActiveObject()) {
              if (e.target.get('pointType') === 'arrow_start') {
                e.target.set('fill', 'black');
              } else if (e.target.get('pointType') === 'arrow_end') {
                e.target.set('fill', 'black');
              }

              canvas.renderAll();
            } else {
              isOver = false;
            }
          });

          canvas.off('mouse:out').on('mouse:out', function(e) {
            if (e.target && isOver) {
              if (e.target.get('pointType')) {

                if (e.target.get('pointType') === 'arrow_start') {
                  e.target.set('fill', originColor);
                } else if (e.target.get('pointType') === 'arrow_end') {
                  e.target.set('fill', 'transparent');
                } else {
                  return;
                }

                isOver = false;

                canvas.discardActiveObject();
                canvas.renderAll();
              }
            }
          });

          tool.parent().removeClass('active').trigger('toolDeactivated');
        });
      break;

      case 'pen':
        $('#palette').show();
        canvas.freeDrawingBrush.color = $('#palette').find('li.active a').attr('class');
        canvas.freeDrawingBrush.hasRotatingPoint = false;
        canvas.isDrawingMode = true;
      break;

      case 'figure':
        $('#palette').show();

        var rect, isDown, origX, origY;

        canvas.on('mouse:down', function(o) {
          isDown = true;
          var pointer = canvas.getPointer(o.e);
          origX = pointer.x;
          origY = pointer.y;

          rect = new fabric.Rect({
            left: origX,
            top: origY,
            originX: 'left',
            originY: 'top',
            width: pointer.x - origX,
            height: pointer.y - origY,
            strokeWidth: 4,
            fill: 'transparent',
            opacity: 1,
            stroke: $('#palette').find('li.active a').attr('class'),
            transparentCorners: false,
            hasRotatingPoint : false
          });

          rect.setControlsVisibility(HideControls);

          rect.on({
            'scaling': function(e) {
              var obj = this,
                  w = obj.width * obj.scaleX,
                  h = obj.height * obj.scaleY,
                  s = obj.strokeWidth;

              obj.set({
                'height'     : h,
                'width'      : w,
                'scaleX'     : 1,
                'scaleY'     : 1
              });
            }
          });

          canvas.add(rect);
        });

        canvas.on('mouse:move', function(o) {
          if (!isDown) return;
          var pointer = canvas.getPointer(o.e);

          if (origX > pointer.x) {
              rect.set({left: Math.abs(pointer.x)});
          }

          if (origY > pointer.y) {
              rect.set({top: Math.abs(pointer.y)});
          }

          rect.set({width: Math.abs(origX - pointer.x)});
          rect.set({height: Math.abs(origY - pointer.y)});
          rect.setCoords();

          canvas.renderAll();
        });

        canvas.on('mouse:up', function(o) {
          isDown = false;

          canvas.off('mouse:down');
          canvas.off('mouse:move');
          canvas.off('mouse:up');

          tool.parent().removeClass('active').trigger('toolDeactivated');
        });
      break;

      case 'blur':
        canvas.on('mouse:down', function(o) {
          isDown = true;
          var pointer = canvas.getPointer(o.e);
          origX = pointer.x;
          origY = pointer.y;

          rect_blur = new fabric.Rect({
            left: origX,
            top: origY,
            width: pointer.x - origX,
            height: pointer.y - origY,
            opacity: 0.1,
            name: 'rect_blur',
            padding: 15,
            hasRotatingPoint : false
          });

          canvas.add(rect_blur);
        });

        canvas.on('mouse:move', function(o) {
          if (!isDown) return;
          var pointer = canvas.getPointer(o.e);

          if (origX > pointer.x) {
              rect_blur.set({ left: Math.abs(pointer.x) });
          }

          if (origY > pointer.y) {
              rect_blur.set({ top: Math.abs(pointer.y) });
          }

          rect_blur.set({ width: Math.abs(origX - pointer.x) });
          rect_blur.set({ height: Math.abs(origY - pointer.y) });
          rect_blur.setCoords();

          canvas.renderAll();
        });

        canvas.on('mouse:up', function(o) {
          isDown = false;

          rect_blur.set('opacity', 0);

          canvas.off('mouse:down');
          canvas.off('mouse:move');
          canvas.off('mouse:up');

          tool.parent().removeClass('active').trigger('toolDeactivated');

          canvas.on('after:render', function() {
            if (typeof rect_blur != 'undefined') {
              var objects = this.getObjects();

              for (var i = 0, len = this.size(); i < len; i++) {
                if (objects[i].name && objects[i].name === 'rect_blur') {
                  stackBlurCanvasRGBA('canvas', parseInt(objects[i].left), parseInt(objects[i].top), parseInt(objects[i].getWidth()), parseInt(objects[i].getHeight()), 5);
                }
              }
            }
          });

          canvas.renderAll();
        });
      break;

      case 'crop':
        var rect, isDown, origX, origY;

        canvas.on('mouse:down', function(o) {
          isDown = true;
          var pointer = canvas.getPointer(o.e);
          origX = pointer.x;
          origY = pointer.y;

          rect = new fabric.Rect({
            left: origX,
            top: origY,
            originX: 'left',
            originY: 'top',
            width: pointer.x - origX,
            height: pointer.y - origY,
            fill: '#fff',
            name: 'crop',
            opacity: 1,
            transparentCorners: false,
            hasRotatingPoint : false,
            hasControls: false,
            selectable: false,
            evented: false
          });

          canvas.add(rect);
          canvas.moveTo(rect, 0);
          
        });

        canvas.on('mouse:move', function(o) {
          if (!isDown) return;
          var pointer = canvas.getPointer(o.e);

          if (origX > pointer.x) {
              rect.set({left: Math.abs(pointer.x)});
          }

          if (origY > pointer.y) {
              rect.set({top: Math.abs(pointer.y)});
          }

          rect.set({width: Math.abs(origX - pointer.x)});
          rect.set({height: Math.abs(origY - pointer.y)});
          rect.setCoords();

          canvas.renderAll();
        });

        canvas.on('mouse:up', function(o) {
          isDown = false;

          canvas.off('mouse:down');
          canvas.off('mouse:move');
          canvas.off('mouse:up');

          rect.set('opacity', 0);canvas.sendToBack(rect);

          tool.parent().removeClass('active').trigger('toolDeactivated');

          canvas.lowerCanvasEl.getContext('2d').clearRect(0,0,canvas.getWidth(),canvas.getHeight());
        });
      break;

      case 'deselect':
        canvas.discardActiveObject();
        $(this).removeClass('active');
      break;
    }
  });

  // Inserted objects

  $(document).on('click', '#edit-area', function(e) {
    tool = $('ul.nav li.active a');
    parentOffset = $(this).parent().offset();
    switch(tool.attr('class')) {
      case 'text':
        color = $('#palette').find('li.active a').attr('class');
        var text = new fabric.IText('Edit text', { 
          fontFamily: 'Arial',
          fontSize: 20,
          left: e.pageX - parentOffset.left, 
          top: e.pageY - parentOffset.top,
          textBackgroundColor: color,
          hasRotatingPoint: false,
          fill: color === 'yellow' ? '#000' : '#fff'
        });

        text.setControlsVisibility({
          'tl':false,
          'tr':true,
          'bl':false,
          'br':false,
          'ml':false,
          'mt':false,
          'mr':false,
          'mb':false,
          'mtr':false
        });

        canvas.add(text);

        tool.parent().removeClass('active').trigger('toolDeactivated');
      break;
    }
  });

  // Save

  // $(document).on('click', '#save', function() {
  //   canvas.deactivateAll().renderAll();

  //   $('body').prepend('<a id="save-link">');
  //   $('#save-link').attr({
  //     href: canvas.toDataURL(),
  //     download: $('input.title').val() + '.png'
  //   });

  //   $('#save-link')[0].click();

  //   canvas.renderAll();
  //   $('#save-link').remove();
  // });
});