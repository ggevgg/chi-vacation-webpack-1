import { find } from 'lodash';
import {  DAYSOFF, 
          TYPE_DAYOFF,
          SHOW_DAYOFF,
          VACATIONS, 
          TYPE_VACATION,
          SHOW_VACATION,
          WORKFROMHOME,
          TYPE_WORKFROMHOME,
          SHOW_WORKFROMHOME,
          UNPAIDLEAVE,
          TYPE_UNPAIDLEAVE,
          SHOW_UNPAIDLEAVE,
        } from '../../core/constants/vacations.consts';

export default class VvController {
  constructor ($scope, $timeout, $parse, userData, $uibModal, moment, groups, status, toastr, user, users, settings, sailsService, $stateParams) {
    'ngInject';
    
    this.sailsService = sailsService;
    this.$parse = $parse;
    this.$stateParams = $stateParams;
    this.toastr = toastr;
    this.roles = users;
    this.users = userData;
    this.groups = groups;
    this.status = status;
    this.filter = {};
    this.filtredUser;
    this.statusFilter = { status: status.NEW };
    this.groupFilter = {};
    this.modal = $uibModal;
    this.pageState = "vacations";
    let today = new Date();
    today = today.setHours(0,0,0,0);
    this.order = 'startDate';
    this.oneThing = [];
    this.userName = [];
    this.events = [];
    this.newEvent = {};
    this.selected = "sds";
    this.calendarView = 'month';
    this.calendarDay = new Date(today);
    this.newEvent.startsAt = new Date(today); 
    this.newEvent.endsAt = new Date(today);
    this.setDateInfo();
    this.holidays = angular.copy(settings.data.data.holidays);
    //  USERS
    $scope.startdate = new Date();
    $scope.minStartDate = new Date($scope.startdate);
    $scope.enddate = new Date($scope.startdate);
    $scope.minEndDate = new Date($scope.startdate);
    $scope.dateFilter = {};
    this.user = user;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.vacationDays = this.calcDays();
    this.moment = moment;
    this.DAYSOFF = DAYSOFF;
    this.VACATIONS = VACATIONS;
    this.WORKFROMHOME = WORKFROMHOME;
    this.UNPAIDLEAVE = UNPAIDLEAVE;
    this.vacationState = VACATIONS;
    this.activate($scope);
    this.dropdownFilter = "Confirmed";
    this.showDeletedUsers = false;
    this.sendingAdditional = false;
    this.sendingRequest = false;
    this.maxDate = moment().add(1, 'year').add(1, 'month');
}

  activate(scope) {

    scope.$watch('startdate', function() {
      if (!scope.startdate) return;
      if (scope.enddate <= scope.startdate) scope.enddate = new Date(scope.startdate);
      scope.minEndDate = new Date(scope.startdate);
    });
    scope.$watch('dateFilter', function() {
      if (!scope.dateFilter.startdate) return;
      if (scope.dateFilter.enddate <= scope.dateFilter.startdate) scope.dateFilter.enddate = new Date(scope.dateFilter.startdate);
      scope.dateFilter.minEndDate = new Date(scope.dateFilter.startdate);
    }, true);

    let { type, id } = this.$stateParams;
    if ( type && id ) {
      let curUser = _.find(this.users, { id });
      if ( curUser ) {
        if ( type === 'Vacaction') this.pageState = VACATIONS;
        if ( type === 'Day-Off') this.pageState = DAYSOFF;
        if ( type === 'WFH') this.pageState = WORKFROMHOME;
        if ( type === 'unpaidLeave') this.pageState = UNPAIDLEAVE;
        this.choiceUser(id, curUser.group, curUser)
      }
    }
    if ( this.user.role === this.roles.TEAMLEAD ) {
      let { responsibleFor, group } = this.user;
      let filterGroups = ( responsibleFor && responsibleFor.length ) ? responsibleFor : [ group ];
      this.groups = this.groups.filter( group => ~filterGroups.indexOf(group) )
    }
  }

    calcNewVacations(group) {
     var sum = 0;
     this.users.forEach(item => {
      if(item.group == group && !item.deleted) {
        angular.forEach(item[this.pageState], el => {
          if(el.status == this.status.NEW) {
            sum++;
          }
        })
      }
     })
     return sum; 
    }
    
    confirmVacation(user, id) {
      let modalInstance = this.modal.open({
        templateUrl: require('!!file!../../components/userTools/modal/confirmVacationAction/confirmVacationAction.html'),
        controller: require('../../components/userTools/modal/confirmVacationAction/confirmVacationAction.controller'),
        controllerAs: 'confirm'
      });
      modalInstance.result.then(
        selectedItem => {
          if (selectedItem) {
            let vac_type = this.getStatus(this.pageState, true);
            let vacation = find(user[this.pageState], { id: id });
            this.sailsService[this.pageState + 'Resource']
            .update({id: vacation.id}, angular.extend({}, vacation, {status: 'confirmed'})).$promise
            .then(
              data => {
                this.toastr.success(vac_type + ' confirmed', 'Success');
                vacation.status = data.data.status;
              },
              error => this.toastr.error(error.data.data.raw.message, 'Error confirming ' + vac_type.toLowerCase())
            );
          }
        }
      )
    }
    
    rejectVacation(user, id) {
      let modalInstance = this.modal.open({
        templateUrl: require('!!file!../../components/userTools/modal/confirmVacationAction/confirmVacationAction.html'),
        controller: require('../../components/userTools/modal/confirmVacationAction/confirmVacationAction.controller'),
        controllerAs: 'confirm'
      });
      modalInstance.result.then(
        selectedItem => {
          if (selectedItem) {
            let vac_type = this.getStatus(this.pageState, true);
            let vacation = find(user[this.pageState], { id: id });
            this.sailsService[this.pageState + 'Resource']
            .update({id: vacation.id}, angular.extend({}, vacation, {status: 'rejected'})).$promise
            .then(
              data => {
                this.toastr.success(vac_type + ' rejected', 'Success');
                vacation.status = data.data.status;
              },
              error => this.toastr.error(error.data.data.raw.message, 'Error rejecting ' + vac_type.toLowerCase())
            );
          }
        }
      )
    }

    pushAddedDays(isAdd) {
      let added = angular.copy(this.filtredUser.added);
      added[this.filtredUser.year] = (this.filtredUser.added[this.filtredUser.year] || 0) + (isAdd ? parseInt(this.filtredUser.addedDays) : 0 - parseInt(this.filtredUser.addedDays));
      this.sendingAdditional = true;
      this.sailsService.userResource.updateUser({id: this.filtredUser.id}, {added: added}).$promise.then(
        () => {this.calcEnableDays(this.$scope.startdate); this.toastr.success('Changed added days', 'Success'); this.sendingAdditional = false;},
        error => {this.toastr.error(error.data.message, 'Error updating user'); this.sendingAdditional = false;}
        );
    }

    pushAddedDaysOff(isAdd) {
      let added = angular.copy(this.filtredUser.addedDaysOff);
      added[this.filtredUser.year] = (this.filtredUser.addedDaysOff[this.filtredUser.year] || 0) + (isAdd ? parseInt(this.filtredUser.newDaysOff) : 0 - parseInt(this.filtredUser.newDaysOff));
      this.sendingAdditional = true;
      this.sailsService.userResource.updateUser({id: this.filtredUser.id}, {addedDaysOff: added}).$promise.then(
        () => {this.calcEnableDays(this.$scope.startdate); this.toastr.success('Changed added days', 'Success'); this.sendingAdditional = false;},
        error => {this.toastr.error(error.data.message, 'Error updating user'); this.sendingAdditional = false;}
        );
    }

    choiceGroup(group) {
      this.filter = { group: group };
      this.groupFilter = { group: group };
     // this.setDateInfo();
      this.filtredUser = {};
    }

    choiceUser(id, group, user) {
      this.filter = { id: id, group:group };
      this.groupFilter = { group: group };
      this.filtredUser = user;
      this.filtredUser.addedDays = 0;
      this.filtredUser.newDaysOff = 0;
      this.setDateInfo();
      this.calcEnableDays(this.$scope.startdate);
    }

    choiceButtonFilter(filter) {
      this.statusFilter.status = filter;
      this.setDateInfo();
    }

    choiceDropdownFilter(filter) {
      this.dropdownFilter = filter;
    }

    openNewUserForm() {
      this.modal.open({
        templateUrl: require('!!file!../../components/userTools/modal/addNewUser/newUserForm.html'),
        controller: require('../../components/userTools/modal/addNewUser/addNewUser.controller'),
        controllerAs: 'user'
      });
    }

    userInfo(user, isAlreadyCalc) {
      if(!isAlreadyCalc) {
        this.calcEnableDays(this.calendarDay, user);
      }

      this.modal.open({
        templateUrl: require('!!file!../../components/userTools/modal/userInfo/userInfo.html'),
        controller: require('../../components/userTools/modal/userInfo/userInfo.controller'),
        controllerAs: 'info',
        resolve: {
          user: user,
          isDelShow: this.user.role == this.roles.ADMIN ? true : false,
          isEditShow: this.user.role == this.roles.ADMIN ? true : false
        }
      });
    }

    isRepeated(obj) {
      for (var i in obj) {
        return false;
      }
      return true;
    }
    
    changePageState(state) {
      this.pageState = state;
      this.setDateInfo();
    }
    
    cellModifier(cell) {
      let date = moment(cell.date).format('YYYY-MM-DD');
      if (~this.holidays.indexOf(date)) 
        cell.cssClass = 'cal-holiday';
    }

    _fillEvents(vacation) {
        angular.forEach(this.users, (value) => {
        var user = value;
        if ( (vacation in value) && (!this.filter.group || this.filter.group == value.group) && (!this.filter.id || this.filter.id == value.id) ) {
          let list = value[vacation];
          var {firstname, lastname} = value;
          var nd = new Date().setHours(0,0,0,0);

          angular.forEach(list, (value) => {
            var {startdate, enddate, status} = value;

            let vs = new Date(value.startdate).setHours(0,0,0,0);
            let ve = new Date(value.enddate).setHours(0,0,0,0);
              //console.log('st',this.statusFilter.status);

               if ( (this.statusFilter.status == "" || (value.status == this.statusFilter.status && value.status != 'confirmed')) ||
                    (((this.statusFilter.status == 'confirmed' ) && (value.status == 'confirmed') && (nd < vs) ) )  ||
                    ((this.statusFilter.status == 'inprogress') && (value.status == 'confirmed') && (vs <= nd) && (ve >= nd) ) || 
                    (((this.statusFilter.status == 'spent') && (value.status == 'confirmed')) && (nd > ve)  ) ) {

                  let typeEvent = {rejected:'important',confirmed:'info', inprogress:'warning', new:'warning'};
                  var event = 
                  {
                    title: (firstname.length > 15 ? firstname.slice(0, 1) + '.' : firstname) + ' '+ (lastname.length > 20 ? lastname.slice(0, 20) + '...' : lastname),
                    type: typeEvent[status],
                    cssClass: vacation,// === 'vacations' ? '' : vacation === 'daysoff' ? 'dayoff' : 'workfromhome',
                    startsAt: new Date(startdate),
                    endsAt: new Date(moment(enddate).add(12, 'hour')),
                    editable: false,
                    deletable: false,
                    incrementsBadgeTotal: true,
                    user: user
                  };
                  this.events.push(event);
                // }
               
               } 
            
          });
        }
      });
    }

setDateInfo() {
    var events = this.events = [];
    this._fillEvents(VACATIONS);
    this._fillEvents(DAYSOFF);
    this._fillEvents(WORKFROMHOME);
    this._fillEvents(UNPAIDLEAVE);
  }

  calcEnableDays(vacationStartDate, filtredUser = this.filtredUser) {

      let user = this.initUserData(vacationStartDate, filtredUser);
      if (!user) return 0;
      

      if(user.year != 0 
        && ((user.formatedEmploymentDate.getMonth() == vacationStartDate.getMonth() && user.formatedEmploymentDate.getDate() <= vacationStartDate.getDate()) 
          || (new Date(moment(user.formatedEmploymentDate).add(1, 'month')).getMonth() == vacationStartDate.getMonth() && user.formatedEmploymentDate.getDate() >= vacationStartDate.getDate()))) 
      {
        user.isCrossingYear = true;
        // console.log(
        //   this.calcDays(moment(user.formatedEmploymentDate)
        //     .add(user.year, 'year')
        //     .add(1, 'month'), vacationStartDate), 
        //   this.calcDays(vacationStartDate, moment(user.formatedEmploymentDate)
        //     .add(user.year, 'year')
        //     .add(1, 'month')))

        user.vacations
          .filter( item => item.year == (user.year - 1) && item.status != "rejected" )
          .forEach( item => user.spendPrevVacation += this.calcDays(item.startdate, item.enddate));

        user.availablePrevDays += this.calcAvailablePrevDays(vacationStartDate, user);

        user.availableDays += user.availablePrevDays < 0 ? 0 : user.availablePrevDays;
      }
      user.vacations
      .filter( item => item.year == user.year && item.status != "rejected" )
      .forEach( item => user.spendVacation += this.calcDays(item.startdate, item.enddate));

      // console.log(user.totalDays)
      user.availableCurDays += user.totalDays - user.spendVacation;
      user.availableDays += user.availableCurDays < 0 ? 0 : user.availableCurDays;
      user.daysoff
      .filter( item => item.year == user.year && item.status != "rejected" )
      .forEach( item => {
        user.spendDaysOff += this.calcDays( item.startdate, item.enddate);
      });
      user.availableDaysOff = 5 - user.spendDaysOff + user.addedCurDaysOff;
      return user.availableDays
  }

  calcAvailablePrevDays (vacationStartDate, user) {
    return (
    (user.totalPrevDays - user.spendPrevVacation > this.calcDays(vacationStartDate, moment(user.formatedEmploymentDate).add(user.year, 'year').add(1, 'month')) ) 
    ? this.calcDays( vacationStartDate, moment(user.formatedEmploymentDate).add(user.year, 'year').add(1, 'month') ) 
    : user.totalPrevDays - user.spendPrevVacation);
  }

  initUserData(vacationStartDate, user) {
    if (! (user && user.added)) return 0;
    let days = moment().isoWeekdayCalc(user.employmentdate, vacationStartDate, [1,2,3,4,5,6,7]) - 1;
    user.formatedEmploymentDate = new Date(user.employmentdate);
    user.year = Math.floor(days / 365.25);
    user.addedCur = user.added[user.year] || 0;
    user.addedPrev = user.added[user.year - 1] || 0;
    user.addedCurDaysOff = user.addedDaysOff[user.year] || 0;
    user.totalDays = Math.round((days % 365.25)*20/365.25) + user.addedCur;
    user.totalPrevDays = 20 + user.addedPrev;
    user.availableDays = 0;
    user.availableCurDays = 0;
    user.availablePrevDays = 0;
    user.spendVacation = 0;
    user.spendPrevVacation = 0;
    user.availableDaysOff = 0;
    user.availableUnpaidLeave = 180;
    user.spendDaysOff = 0;
    user.isCrossingYear = false;
    return user;
  }

  submitHandler(startDate, endDate) {
    let modalInstance = this.modal.open({
      templateUrl: require('!!file!../../components/userTools/modal/confirmAdminCreateVacation/confirmAdminCreateVacation.html'),
      controller: require('../../components/userTools/modal/confirmAdminCreateVacation/confirmAdminCreateVacation.controller'),
      controllerAs: 'confirm'
    });
    modalInstance.result.then(
      selectedItem => {
        if (selectedItem) {

          this.sendingRequest = true;
          let vac_type = this.getStatus(this.vacationState, true);
          let vm = this;
          let sDate = new Date(startDate).getTime();
          let eDate = new Date(endDate).getTime();
          let toastrOptions = {progressBar: false};
          /*let vacation;*/

          let listArray = [];
          vm.vacations = [];
          listArray.push(this.filtredUser['vacations']);
          listArray.push(this.filtredUser['daysoff']);
          listArray.push(this.filtredUser['workfromhome']);
          listArray.push(this.filtredUser['unpaidleave']);



          listArray.forEach( list => {
            if (list) {
              for (let item in list) {
                if (list[item].status === 'rejected') continue;
                vm.vacations.push({startDate: list[item].startdate, endDate: list[item].enddate, status: list[item].status, commentary: list[item].commentary});
              }
            }
          });

          if (vm.vacations && isCrossingIntervals(vm.vacations)) {
            this.toastr.error(vac_type + ' intervals are crossing! Please, choose correct date.', toastrOptions);
            this.sendingRequest = false;
            return;
          }

          /*let total = this.vacationState === this.VACATIONS ? this.filtredUser.availableDays : this.filtredUser.availableDaysOff;
          if (this.filtredUser.vacationDays > total) {
            this.toastr.error('You have exceeded the number of available days!', toastrOptions);
            this.sendingRequest = false;
            return;
          }*/

          let vacation = {
            startdate: new Date(sDate),
            enddate: new Date(eDate),
            //status: 'inprogress',
            commentary: null,
            status: "new"
          };
          const {create} = this.sailsService[this.vacationState + 'Resource'];
          const {id: uid, year} = this.filtredUser;
          const {startdate, enddate, status} = vacation;
          const createError = ({data: data}) => {
            this.sendingRequest = false;
            this.toastr.error(this.$parse('raw.message')(data) || this.$parse('data.raw.message')(data) || '', 'Error creating ' + vac_type.toLowerCase(), toastrOptions);
          }
          const createSuccess = res => {
            this.toastr.success(vac_type + ' request was sent successfully!', toastrOptions);
            if (!_.find(this.filtredUser[this.vacationState], {id:res.data.id}))
              this.filtredUser[this.vacationState].push(res.data);
            this.calcEnableDays(this.$scope.startdate);
            this.sendingRequest = false;
          }


          if(this.vacationState == "daysoff") {
            create({uid, startdate, enddate, status, year })
            .$promise.then(createSuccess, createError);
            return;
          }

          if(this.filtredUser.availablePrevDays <= 0) {
            create({uid, startdate, enddate, status, year })
            .$promise.then(createSuccess, createError);
            return;
          }

          if(this.filtredUser.vacationDays > this.filtredUser.availablePrevDays){
            let mDate = moment(sDate).isoAddWeekdaysFromSet(this.filtredUser.availablePrevDays - 1, [1,2,3,4,5], angular.copy(this.holidays));
            create({uid, startdate, enddate: new Date(mDate), status, year: year - 1 })
            .$promise.then(createSuccess, createError);
            create({uid, startdate: moment(new Date(mDate)).add(1, 'day'), enddate, status, year })
            .$promise.then(createSuccess, createError);
          } else {
            create({uid, startdate, enddate, status, year: year - 1 })
            .$promise.then(createSuccess, createError);
          }



          function isCrossingIntervals(dateIntervals) {
            if(dateIntervals.length === 0) return false;

            let result = dateIntervals.filter(function(item) {
              if  (sDate <= new Date(item.endDate).getTime() && eDate >= new Date(item.startDate).getTime()) {
                return true;
              }
            });

            return !!result.length;

          }

        }
      }
    )

  }

  changeVacationState(state) {
    this.vacationState = state;
  }

  isVacationState(state) {
    return this.vacationState === state;
  }

  calcDaysCalc() {
    this.$timeout(()=> {
      if (this.$scope.startdate && this.$scope.enddate) {
        this.filtredUser.vacationDays = this.moment().isoWeekdayCalc(this.$scope.startdate, this.$scope.enddate, [1, 2, 3, 4, 5], angular.copy(this.holidays));
        this.calcEnableDays(this.$scope.startdate)
      } else {
        this.filtredUser.vacationDays = 0;
      }
    });

  }

  calcDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    return moment().isoWeekdayCalc(startDate, endDate, [1, 2, 3, 4, 5], angular.copy(this.holidays))
  }

  setOrder(val) {
    this.order = val;
  }

  isActive(val) {
    return val === this.order;
  }

  getStatus(vac_type, capitalize) {
    switch(vac_type) {
      case undefined:
      case VACATIONS:
      case TYPE_VACATION: return capitalize ? _.capitalize(SHOW_VACATION) : SHOW_VACATION;
      case DAYSOFF:
      case TYPE_DAYOFF: return capitalize ? _.capitalize(SHOW_DAYOFF) : SHOW_DAYOFF;
      case WORKFROMHOME:
      case TYPE_WORKFROMHOME: return capitalize ? _.capitalize(SHOW_WORKFROMHOME) : SHOW_WORKFROMHOME;
      case UNPAIDLEAVE:
      case TYPE_UNPAIDLEAVE: return capitalize ? _.capitalize(SHOW_UNPAIDLEAVE) : SHOW_UNPAIDLEAVE;
    }
  }

  getTotalDaysWFH(vac) {
    return vac.reduce( (prev, el) =>
        prev + moment().isoWeekdayCalc(el.startdate, el.enddate, [1, 2, 3, 4, 5], angular.copy(this.holidays)), 0)
  }

}